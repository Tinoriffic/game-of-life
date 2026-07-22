import Foundation

/// Snapshot the app writes to the App Group after each Today load / habit log.
/// Adds the per-habit array behind the configurable card.
struct WidgetData: Codable {
    struct Day: Codable {
        let date: String        // "yyyy-MM-dd"
        let count: Int
        let status: String      // none | partial | complete (+ "logged" from overall feed)
    }

    struct HabitData: Codable {
        let id: String
        let name: String
        let icon: String
        let cadence: String     // daily | weekly (cadence_type passthrough)
        let timesPerWeek: Int
        let streak: Int
        let doneToday: Bool
        let weekCount: Int
        let days: [Day]

        var isWeekly: Bool { cadence != "daily" && timesPerWeek > 0 }
        var weekTargetMet: Bool { isWeekly && weekCount >= timesPerWeek }
        /// The card's "settled" state: daily → logged today; weekly → target met.
        var isSettled: Bool { isWeekly ? weekTargetMet : doneToday }
    }

    let updatedAt: String
    let todayDate: String
    let dayStreak: Int
    let completed: Int
    let scheduled: Int
    let isComplete: Bool
    let days: [Day]
    let habits: [HabitData]?    // optional: v1 payloads predate it

    static let appGroupId = "group.com.faustino.mev2"
    static let fileName = "widget-data.json"

    static func load() -> WidgetData? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId),
            let data = try? Data(contentsOf: container.appendingPathComponent(fileName))
        else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    func habit(withId id: String) -> HabitData? {
        habits?.first { $0.id == id }
    }

    var habitIds: [String] { (habits ?? []).map { $0.id } }

    /// Gallery preview / placeholder: a plausible-looking recent stretch.
    static func sample() -> WidgetData {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        func makeDays(_ pattern: [String]) -> [Day] {
            (0..<126).map { i in
                let date = Calendar.current.date(byAdding: .day, value: -(125 - i), to: Date())!
                // sparse early history, dense recent — matches a real ramp-up
                let density = i < 70 ? 4 : (i < 100 ? 2 : 1)
                let status = i % density == 0 ? pattern[i % pattern.count] : "none"
                return Day(date: formatter.string(from: date),
                           count: status == "none" ? 0 : 1 + i % 3, status: status)
            }
        }
        let habits = [
            HabitData(id: "1", name: "Workout", icon: "🏋️", cadence: "daily", timesPerWeek: 0,
                      streak: 8, doneToday: true, weekCount: 5,
                      days: makeDays(["complete", "complete", "none"])),
            HabitData(id: "2", name: "Read", icon: "📖", cadence: "daily", timesPerWeek: 0,
                      streak: 12, doneToday: true, weekCount: 6,
                      days: makeDays(["complete", "none", "complete"])),
            HabitData(id: "3", name: "Meditate", icon: "🧘", cadence: "daily", timesPerWeek: 0,
                      streak: 4, doneToday: false, weekCount: 4,
                      days: makeDays(["complete", "complete", "complete", "none"])),
        ]
        return WidgetData(updatedAt: "", todayDate: formatter.string(from: Date()),
                          dayStreak: 12, completed: 2, scheduled: 3,
                          isComplete: false, days: makeDays(["complete", "partial", "complete"]),
                          habits: habits)
    }
}

/// Cycle-mode state: which habit the "Cycle through habits" widget is showing.
/// Shared through the App Group so the chevron intents and the widget agree.
enum WidgetCycle {
    static let sentinel = "__cycle__"          // config value that means "cycle mode"
    private static let key = "cycleHabitId"

    static var currentId: String? {
        get { UserDefaults(suiteName: WidgetData.appGroupId)?.string(forKey: key) }
        set { UserDefaults(suiteName: WidgetData.appGroupId)?.set(newValue, forKey: key) }
    }
}
