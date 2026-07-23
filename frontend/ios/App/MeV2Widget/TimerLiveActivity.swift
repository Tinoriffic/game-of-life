import ActivityKit
import SwiftUI
import WidgetKit

/// Lock-screen + Dynamic Island rendering for the meditation / workout-rest
/// countdown. iOS drives the countdown itself via `Text(timerInterval:)` from
/// the end timestamp — the app pushes no per-second updates. A paused activity
/// shows a frozen remaining value instead of a live counter.
@available(iOS 16.1, *)
struct TimerLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TimerActivityAttributes.self) { context in
            // Lock-screen / banner presentation.
            HStack(spacing: 14) {
                icon(for: context.attributes.type)
                    .font(.title2)
                    .foregroundStyle(tint(context.attributes.type))
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.label)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                    Text(context.state.paused ? "Paused" : "In progress")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.5))
                }
                Spacer()
                timerLabel(context)
                    .font(.system(.title, design: .rounded).monospacedDigit())
                    .foregroundStyle(tint(context.attributes.type))
            }
            .padding(16)
            .activityBackgroundTint(Color.black.opacity(0.55))
            .activitySystemActionForegroundColor(MeV2Palette.cellHigh)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    icon(for: context.attributes.type)
                        .font(.title3)
                        .foregroundStyle(tint(context.attributes.type))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    timerLabel(context)
                        .font(.system(.title2, design: .rounded).monospacedDigit())
                        .foregroundStyle(tint(context.attributes.type))
                        .frame(maxWidth: 96, alignment: .trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text(context.state.paused ? "\(context.state.label) · paused" : context.state.label)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
            } compactLeading: {
                // Remaining time on the leading side so it stays visible even
                // when another app shares the island and ours is pushed right.
                timerLabel(context)
                    .monospacedDigit()
                    .foregroundStyle(tint(context.attributes.type))
                    .frame(maxWidth: 56)
            } compactTrailing: {
                icon(for: context.attributes.type)
                    .foregroundStyle(tint(context.attributes.type))
            } minimal: {
                // Show the time (not just an icon) in the tiny two-activity slot.
                timerLabel(context)
                    .font(.system(size: 13, design: .rounded).monospacedDigit())
                    .foregroundStyle(tint(context.attributes.type))
                    .frame(maxWidth: 44)
            }
            .widgetURL(URL(string: "mev2://timer"))
        }
    }

    // Live counter while running; frozen mm:ss while paused. The range is
    // clamped so a just-expired activity can't form an invalid Date range.
    @ViewBuilder
    private func timerLabel(_ context: ActivityViewContext<TimerActivityAttributes>) -> some View {
        if context.state.paused, let rem = context.state.remainingAtPause {
            Text(paused(rem))
        } else {
            let end = max(context.state.endsAt, Date())
            Text(timerInterval: Date()...end, countsDown: true)
                .multilineTextAlignment(.trailing)
        }
    }

    private func icon(for type: String) -> Image {
        Image(systemName: type == "workout" ? "dumbbell.fill" : "leaf.fill")
    }

    private func tint(_ type: String) -> Color {
        type == "workout" ? MeV2Palette.accent : MeV2Palette.cellHigh
    }

    private func paused(_ seconds: Double) -> String {
        let s = max(0, Int(seconds.rounded()))
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}
