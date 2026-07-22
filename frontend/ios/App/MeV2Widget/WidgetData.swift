import Foundation

/// Snapshot the app writes to the App Group after each Today load / habit log.
/// Contract: product-specs/ios-app/phase-2-heatmap-widget.md (widget-data.json).
struct WidgetData: Codable {
    struct Day: Codable {
        let date: String        // "yyyy-MM-dd"
        let count: Int
        let status: String      // none | partial | complete
    }

    let updatedAt: String
    let todayDate: String
    let dayStreak: Int
    let completed: Int
    let scheduled: Int
    let isComplete: Bool
    let days: [Day]

    static let appGroupId = "group.com.faustino.mev2"
    static let fileName = "widget-data.json"

    static func load() -> WidgetData? {
        guard let container = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupId),
            let data = try? Data(contentsOf: container.appendingPathComponent(fileName))
        else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    /// Gallery preview / placeholder: a plausible-looking recent stretch.
    static func sample() -> WidgetData {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = .current
        let statuses = ["complete", "complete", "partial", "complete", "none",
                        "complete", "complete", "complete", "partial", "complete",
                        "complete", "none", "complete", "complete"]
        let days: [Day] = (0..<126).map { i in
            let date = Calendar.current.date(byAdding: .day, value: -(125 - i), to: Date())!
            let status = statuses[i % statuses.count]
            return Day(date: formatter.string(from: date),
                       count: status == "none" ? 0 : Int.random(in: 1...4),
                       status: status)
        }
        return WidgetData(updatedAt: "", todayDate: formatter.string(from: Date()),
                          dayStreak: 12, completed: 3, scheduled: 5,
                          isComplete: false, days: days)
    }
}
