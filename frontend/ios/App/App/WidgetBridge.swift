import Capacitor
import Foundation
import WidgetKit

/// App-local Capacitor plugin: receives the day/heatmap snapshot from the web
/// app (`Native.syncWidgetData`), writes it to the shared App Group container,
/// and asks WidgetKit to re-render the home-screen widgets.
///
/// Registered in `AppViewController.capacitorDidLoad()` — not an npm package.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise)
    ]

    static let appGroupId = "group.com.faustino.mev2"
    static let fileName = "widget-data.json"

    @objc func sync(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("Missing 'json' string")
            return
        }
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: Self.appGroupId) else {
            call.reject("App Group \(Self.appGroupId) unavailable — check the App Groups capability on the App target")
            return
        }
        do {
            try data.write(to: container.appendingPathComponent(Self.fileName), options: .atomic)
            WidgetCenter.shared.reloadAllTimelines()
            call.resolve()
        } catch {
            call.reject("Widget data write failed: \(error.localizedDescription)")
        }
    }
}
