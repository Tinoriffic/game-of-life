import Capacitor
import UIKit

/// Custom bridge view controller (wired in Main.storyboard) whose only job is
/// registering app-local plugins that don't ship as npm packages.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(TimerBridgePlugin())
    }
}
