import ActivityKit
import Capacitor
import Foundation
import UserNotifications

/// App-local Capacitor plugin backing `Native.*` in native/nativeBridge.js.
///
/// Two jobs, both about reaching the user when the WebView is asleep:
///  1. `scheduleAlert` / `cancelAlert` — local notifications (sound + haptic)
///     that fire at a wall-clock time even when the phone is locked or the app
///     is backgrounded, which Web Audio + navigator.vibrate cannot do.
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

    // MARK: - Local notifications

    @objc func scheduleAlert(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let fireAt = call.getDouble("fireAt") else {
            call.reject("Missing 'id' or 'fireAt'")
            return
        }
        let title = call.getString("title") ?? "Timer"
        let body = call.getString("body") ?? "Your timer has finished."
        let seconds = (fireAt - Date().timeIntervalSince1970 * 1000) / 1000

        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted, seconds > 0.5 else {
                // Too soon (or denied) — nothing to schedule; the foreground
                // Web Audio cue still covers the in-app case.
                DispatchQueue.main.async { call.resolve() }
                return
            }
            let content = UNMutableNotificationContent()
            content.title = title
            content.body = body
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: seconds, repeats: false)
            let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
            center.add(request) { error in
                DispatchQueue.main.async {
                    if let error = error { call.reject("Notification schedule failed: \(error.localizedDescription)") }
                    else { call.resolve() }
                }
            }
        }
    }

    @objc func cancelAlert(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else { call.reject("Missing 'id'"); return }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])
        call.resolve()
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
