import AppIntents
import WidgetKit

/// Options for the Edit-Widget "Habit" picker, read live from the App Group
/// snapshot. Each option's value is the habit id (String) — stored directly in
/// the widget's configuration, so there's no entity round-trip to fail.
struct HabitOptionsProvider: DynamicOptionsProvider {
    func results() async throws -> ItemCollection<String> {
        let habits = WidgetData.load()?.habits ?? []
        let cycleItem = IntentItem<String>(WidgetCycle.sentinel, title: "🔄  Cycle through habits")
        let habitItems = habits.map { habit in
            IntentItem<String>(
                habit.id,
                title: "\(habit.icon.isEmpty ? "" : habit.icon + "  ")\(habit.name)"
            )
        }
        return ItemCollection {
            ItemSection(items: [cycleItem])
            ItemSection(items: habitItems)
        }
    }
}

/// Widget configuration: leave Habit empty for the all-habits card, or pick a
/// habit id to focus this instance.
struct SelectHabitIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Choose Habit"
    static var description = IntentDescription("Show all your habits together, or focus this widget on one.")

    @Parameter(title: "Habit (leave empty for all)", optionsProvider: HabitOptionsProvider())
    var habitId: String?
}
