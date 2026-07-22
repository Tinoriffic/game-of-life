import ActivityKit
import Foundation

/// Shared Live Activity schema for the meditation & workout-rest countdowns.
///
/// Compiled into BOTH the App target (where `TimerBridge` starts/updates the
/// activity) and the widget extension (where `TimerLiveActivity` renders it),
/// so ActivityKit can match the attributes type across the two processes.
///
/// ActivityKit requires iOS 16.1; the App target deploys to 15.0, so the type
/// and every use of it is availability-gated.
@available(iOS 16.1, *)
struct TimerActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// Wall-clock end of the countdown. iOS animates toward this itself via
        /// `Text(timerInterval:)` — no per-second updates pushed from the app.
        var endsAt: Date
        /// Frozen remaining seconds while paused (nil when running).
        var remainingAtPause: Double?
        var paused: Bool
        /// Human label for the sit / rest (e.g. the habit name, or "Rest").
        var label: String
    }

    /// "meditation" | "workout" — lets the UI pick an icon/tint.
    var type: String
}
