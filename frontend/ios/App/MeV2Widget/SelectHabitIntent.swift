import AppIntents
import WidgetKit

/// One habit in the Edit-Widget picker. Options are read live from the App
/// Group snapshot, so the list is exactly the habits the app last synced.
struct HabitEntity: AppEntity {
    let id: String
    let name: String
    let icon: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Habit"
    static var defaultQuery = HabitQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(icon.isEmpty ? "" : icon + "  ")\(name)")
    }
}

struct HabitQuery: EntityQuery {
    private func all() -> [HabitEntity] {
        (WidgetData.load()?.habits ?? []).map {
            HabitEntity(id: $0.id, name: $0.name, icon: $0.icon)
        }
    }
    func entities(for identifiers: [String]) async throws -> [HabitEntity] {
        all().filter { identifiers.contains($0.id) }
    }
    func suggestedEntities() async throws -> [HabitEntity] {
        all()
    }
}

/// The widget's configuration: leave Habit empty for the all-habits card, or
/// pick one habit to focus this instance.
struct SelectHabitIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose Habit"
    static var description = IntentDescription("Show all your habits together, or focus this widget on one.")

    @Parameter(title: "Habit (leave empty for all)")
    var habit: HabitEntity?
}
