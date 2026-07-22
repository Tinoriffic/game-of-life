import AppIntents
import WidgetKit

enum CycleDirection: String, AppEnum {
    case next, previous
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Direction"
    static var caseDisplayRepresentations: [CycleDirection: DisplayRepresentation] = [
        .next: "Next", .previous: "Previous",
    ]
}

/// Runs when a chevron on the cycle-mode widget is tapped: advance the shown
/// habit through the list and reload. Interactive widget (iOS 17+).
struct CycleHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "Cycle Habit"

    @Parameter(title: "Direction")
    var direction: CycleDirection

    init() {}
    init(_ direction: CycleDirection) { self.direction = direction }

    func perform() async throws -> some IntentResult {
        let ids = WidgetData.load()?.habitIds ?? []
        guard !ids.isEmpty else { return .result() }
        let current = WidgetCycle.currentId ?? ids.first!
        let idx = ids.firstIndex(of: current) ?? 0
        let n = ids.count
        let nextIdx = direction == .next ? (idx + 1) % n : (idx - 1 + n) % n
        WidgetCycle.currentId = ids[nextIdx]
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
