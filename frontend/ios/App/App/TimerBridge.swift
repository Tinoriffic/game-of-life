import ActivityKit
import AVFoundation
import Capacitor
import Foundation
import UIKit
import UserNotifications

/// App-local Capacitor plugin backing `Native.*` in native/nativeBridge.js.
///
/// Two jobs, both about reaching the user when the WebView is asleep:
///  1. `scheduleAlert` / `cancelAlert` — an alarm-grade background sound. A
///     countdown must be able to ring like a real alarm: audible over your
///     music, through the Silent switch, while the app is backgrounded or the
///     phone is locked. A silent looping "keep-alive" track keeps the app running in the
///     background and, at zero, play the alarm sound on a loop until it's
///     dismissed. `.playback` ignores the Silent switch; `.mixWithOthers` lets
///     your music keep playing underneath. A local notification (with the same
///     sound) is still scheduled as a fallback for the rare case where iOS
///     reclaims the app before it can ring; when the app IS alive to ring the
///     audio, that notification is cancelled a beat early so it never doubles.
///  2. `startLiveActivity` / `updateLiveActivity` / `endLiveActivity` — an
///     ActivityKit countdown in the Dynamic Island & lock screen. iOS animates
///     the countdown itself from an end timestamp; nothing is ticked from JS.
///
/// Registered in `AppViewController.capacitorDidLoad()` — not an npm package.
@objc(TimerBridgePlugin)
public class TimerBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TimerBridgePlugin"
    public let jsName = "TimerBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scheduleAlert", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAlert", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateLiveActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endLiveActivity", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Background-audio alarm

    private var keepAlivePlayer: AVAudioPlayer?
    private var alarmPlayer: AVAudioPlayer?
    private var fireWork: DispatchWorkItem?
    private var autoStopWork: DispatchWorkItem?

    // Stop ringing on its own if the user never opens the app to dismiss it.
    private static let maxRingSeconds = 60.0

    @objc func scheduleAlert(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let fireAt = call.getDouble("fireAt") else {
            call.reject("Missing 'id' or 'fireAt'")
            return
        }
        let seconds = (fireAt - Date().timeIntervalSince1970 * 1000) / 1000
        guard seconds > 0.3 else { call.resolve(); return }
        let soundKey = call.getString("sound")
        let title = call.getString("title") ?? "Timer"
        let body = call.getString("body") ?? "Your timer has finished."

        DispatchQueue.main.async {
            self.teardownAlarm()               // a fresh arm supersedes any previous
            self.scheduleFallbackNotification(id: id, seconds: seconds, title: title, body: body, soundKey: soundKey)
            self.startKeepAlive()
            self.armAudioAlarm(afterSeconds: seconds, soundKey: soundKey, notificationId: id)
            call.resolve()
        }
    }

    @objc func cancelAlert(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing 'id'"); return }
        DispatchQueue.main.async {
            self.teardownAlarm()
            let center = UNUserNotificationCenter.current()
            center.removePendingNotificationRequests(withIdentifiers: [id])
            center.removeDeliveredNotifications(withIdentifiers: [id])
            call.resolve()
        }
    }

    // MARK: alarm internals

    private var audioSession: AVAudioSession { AVAudioSession.sharedInstance() }

    private func activateSession() {
        do {
            try audioSession.setCategory(.playback, options: [.mixWithOthers])
            try audioSession.setActive(true)
        } catch {
            print("TimerBridge: audio session activation failed — \(error.localizedDescription)")
        }
    }

    // A silent looping track keeps the app alive in the background so the alarm
    // can fire on time. Started when the countdown is armed.
    private func startKeepAlive() {
        guard keepAlivePlayer == nil, let url = Bundle.main.url(forResource: "silence", withExtension: "caf") else { return }
        activateSession()
        keepAlivePlayer = try? AVAudioPlayer(contentsOf: url)
        keepAlivePlayer?.numberOfLoops = -1
        keepAlivePlayer?.volume = 0
        keepAlivePlayer?.play()
    }

    private func armAudioAlarm(afterSeconds seconds: Double, soundKey: String?, notificationId: String) {
        // Fire a beat early so we can cancel the fallback notification before it
        // sounds — that's what prevents a double alert when the app is alive.
        // The <0.4s head start on the alarm is imperceptible for a timer.
        let lead = min(0.4, seconds)
        let work = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            let center = UNUserNotificationCenter.current()
            center.removePendingNotificationRequests(withIdentifiers: [notificationId])
            center.removeDeliveredNotifications(withIdentifiers: [notificationId])
            // In the foreground the in-app Web Audio chime is the cue; only the
            // backgrounded / locked case needs the loud alarm.
            if UIApplication.shared.applicationState == .active {
                self.teardownAlarm()
                return
            }
            self.ringAlarm(soundKey: soundKey)
        }
        fireWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + max(0, seconds - lead), execute: work)
    }

    private func ringAlarm(soundKey: String?) {
        guard let url = Bundle.main.url(forResource: Self.fileName(for: soundKey), withExtension: "caf") else { return }
        activateSession()
        alarmPlayer = try? AVAudioPlayer(contentsOf: url)
        alarmPlayer?.numberOfLoops = -1        // ring until dismissed
        alarmPlayer?.volume = 1
        alarmPlayer?.play()

        let stop = DispatchWorkItem { [weak self] in self?.teardownAlarm() }
        autoStopWork = stop
        DispatchQueue.main.asyncAfter(deadline: .now() + Self.maxRingSeconds, execute: stop)
    }

    private func teardownAlarm() {
        fireWork?.cancel(); fireWork = nil
        autoStopWork?.cancel(); autoStopWork = nil
        alarmPlayer?.stop(); alarmPlayer = nil
        keepAlivePlayer?.stop(); keepAlivePlayer = nil
        try? audioSession.setActive(false, options: [.notifyOthersOnDeactivation])
    }

    // Fires only if iOS reclaimed the app before it could ring the audio alarm;
    // carries the same custom sound. Cancelled a beat early (see armAudioAlarm)
    // whenever the app is alive, so it never doubles with the audio.
    private func scheduleFallbackNotification(id: String, seconds: Double, title: String, body: String, soundKey: String?) {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = Self.sound(for: soundKey)
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
            center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }
    }

    private static func fileName(for key: String?) -> String {
        key == "workout" ? "rest-over" : "meditation-end"
    }

    private static func sound(for key: String?) -> UNNotificationSound {
        UNNotificationSound(named: UNNotificationSoundName("\(fileName(for: key)).caf"))
    }

    // MARK: - Live Activity (Dynamic Island)

    @objc func startLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(); return }
        guard let id = call.getString("id"), let endsAtMs = call.getDouble("endsAt") else {
            call.reject("Missing 'id' or 'endsAt'")
            return
        }
        let type = call.getString("type") ?? "meditation"
        let label = call.getString("label") ?? "Timer"
        let endsAt = Date(timeIntervalSince1970: endsAtMs / 1000)

        // Replace any existing activity under this id (a new sit supersedes).
        Self.endActivity(id: id)

        let attributes = TimerActivityAttributes(type: type)
        let state = TimerActivityAttributes.ContentState(
            endsAt: endsAt, remainingAtPause: nil, paused: false, label: label)
        do {
            let activity: Activity<TimerActivityAttributes>
            if #available(iOS 16.2, *) {
                activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: state, staleDate: endsAt.addingTimeInterval(60)))
            } else {
                activity = try Activity.request(attributes: attributes, contentState: state)
            }
            Self.activities[id] = activity
            call.resolve()
        } catch {
            call.reject("Live Activity start failed: \(error.localizedDescription)")
        }
    }

    @objc func updateLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        guard let id = call.getString("id"), let activity = Self.activities[id] else {
            call.resolve()   // nothing live under this id — no-op
            return
        }
        let paused = call.getBool("paused") ?? false
        let label = call.getString("label") ?? activity.attributes.type
        let currentEndsAt: Date
        if #available(iOS 16.2, *) { currentEndsAt = activity.content.state.endsAt }
        else { currentEndsAt = activity.contentState.endsAt }
        let endsAt = call.getDouble("endsAt").map { Date(timeIntervalSince1970: $0 / 1000) }
            ?? currentEndsAt
        let remaining = call.getDouble("remainingAtPause")

        let state = TimerActivityAttributes.ContentState(
            endsAt: endsAt, remainingAtPause: paused ? remaining : nil, paused: paused, label: label)
        Task {
            if #available(iOS 16.2, *) {
                await activity.update(.init(state: state, staleDate: endsAt.addingTimeInterval(60)))
            } else {
                await activity.update(using: state)
            }
            call.resolve()
        }
    }

    @objc func endLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        guard let id = call.getString("id") else { call.reject("Missing 'id'"); return }
        Self.endActivity(id: id)
        call.resolve()
    }

    // MARK: - Activity registry

    @available(iOS 16.1, *)
    private static var activities: [String: Activity<TimerActivityAttributes>] {
        get { _activities as? [String: Activity<TimerActivityAttributes>] ?? [:] }
        set { _activities = newValue }
    }
    // Type-erased backing store so the stored property itself needs no @available.
    private static var _activities: Any = [String: Any]()

    @available(iOS 16.1, *)
    private static func endActivity(id: String) {
        guard let activity = activities[id] else { return }
        activities[id] = nil
        Task { await activity.end(dismissalPolicy: .immediate) }
    }
}
