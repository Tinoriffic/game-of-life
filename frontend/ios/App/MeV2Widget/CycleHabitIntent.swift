import AppIntents
import WidgetKit

/// Advance the cycle-mode habit by `step` (+1 next, -1 previous) and reload.
private func advanceCycle(_ step: Int) {
    let ids = WidgetData.load()?.habitIds ?? []
    guard !ids.isEmpty else { return }
    let current = WidgetCycle.currentId ?? ids.first!
    let idx = ids.firstIndex(of: current) ?? 0
    let n = ids.count
    WidgetCycle.currentId = ids[(idx + step + n) % n]
    WidgetCenter.shared.reloadAllTimelines()
}

// Parameterless intents are the most reliable form for interactive widget
// buttons — nothing to serialize, so perform() always fires.
struct CycleNextIntent: AppIntent {
    static var title: LocalizedStringResource = "Next Habit"
    init() {}
    func perform() async throws -> some IntentResult {
        advanceCycle(1)
        return .result()
    }
}

struct CyclePreviousIntent: AppIntent {
    static var title: LocalizedStringResource = "Previous Habit"
    init() {}
    func perform() async throws -> some IntentResult {
        advanceCycle(-1)
        return .result()
    }
}
