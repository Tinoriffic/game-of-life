//
//  MeV2Widget.swift
//  The home-screen habit widget.
//
//  One configurable widget: all-habits by default, or a single habit via
//  Edit Widget. Reads the App Group snapshot the app pushes (no network here);
//  re-rendered on every WidgetBridge sync + at local midnight.
//

import WidgetKit
import SwiftUI
import AppIntents

struct HeatmapEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
    let habitId: String?        // resolved habit to show (nil = all-habits card)
    var cycleMode: Bool = false // show chevrons + page dots
    var cycleIndex: Int = 0
    var cycleTotal: Int = 0
}

/// Turn the configured value (nil / a habit id / the cycle sentinel) into a
/// concrete entry, resolving the cycle-mode habit from shared state.
func makeEntry(configured: String?, data: WidgetData?) -> HeatmapEntry {
    guard let data = data else {
        return HeatmapEntry(date: Date(), data: nil, habitId: configured)
    }
    if configured == WidgetCycle.sentinel {
        let ids = data.habitIds
        let current = WidgetCycle.currentId ?? ids.first
        let idx = current.flatMap { ids.firstIndex(of: $0) } ?? 0
        return HeatmapEntry(date: Date(), data: data, habitId: current,
                            cycleMode: true, cycleIndex: idx, cycleTotal: ids.count)
    }
    return HeatmapEntry(date: Date(), data: data, habitId: configured)
}

struct Provider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> HeatmapEntry {
        HeatmapEntry(date: Date(), data: WidgetData.sample(), habitId: nil)
    }

    func snapshot(for configuration: SelectHabitIntent, in context: Context) async -> HeatmapEntry {
        makeEntry(configured: configuration.habitId, data: WidgetData.load() ?? WidgetData.sample())
    }

    func timeline(for configuration: SelectHabitIntent, in context: Context) async -> Timeline<HeatmapEntry> {
        let entry = makeEntry(configured: configuration.habitId, data: WidgetData.load())
        // Re-render at next local midnight so "today" rolls over even unopened.
        let midnight = Calendar.current.nextDate(
            after: Date(), matching: DateComponents(hour: 0, minute: 0),
            matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
        return Timeline(entries: [entry], policy: .after(midnight))
    }
}

// MARK: - Routing

struct MeV2WidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: HeatmapEntry

    var body: some View {
        if let data = entry.data {
            if let id = entry.habitId {
                if let habit = data.habit(withId: id) {
                    switch family {
                    case .systemMedium:
                        HabitMediumCard(habit: habit, todayDate: data.todayDate,
                                        cycle: entry.cycleMode, index: entry.cycleIndex, total: entry.cycleTotal)
                    default:
                        HabitSmallCard(habit: habit, todayDate: data.todayDate,
                                       cycle: entry.cycleMode, index: entry.cycleIndex, total: entry.cycleTotal)
                    }
                } else {
                    MissingHabitView()   // picked habit no longer exists
                }
            } else {
                switch family {
                case .systemMedium: AllHabitsMediumCard(data: data)
                default: AllHabitsSmallCard(data: data)
                }
            }
        } else {
            EmptyStateView()
        }
    }
}

// MARK: - All-habits cards

struct AllHabitsSmallCard: View {
    let data: WidgetData
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 0) {
                    StreakView(streak: data.dayStreak, settled: data.isComplete, size: 18)
                    Text("streak").font(.system(size: 8, weight: .semibold))
                        .foregroundColor(MeV2Palette.textFaint)
                }
                Spacer()
                DayRingView(completed: data.completed, scheduled: data.scheduled,
                            isComplete: data.isComplete, size: 38, lineWidth: 4)
            }
            TwoWeekStripView(days: data.days, todayDate: data.todayDate,
                             todaySettled: data.isComplete)
            HabitDotsRow(habits: data.habits ?? [], max: 4, dot: 19)
        }
    }
}

struct AllHabitsMediumCard: View {
    let data: WidgetData
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .center, spacing: 11) {
                VStack(spacing: 1) {
                    StreakView(streak: data.dayStreak, settled: data.isComplete, size: 20)
                    Text("day streak").font(.system(size: 9, weight: .semibold))
                        .foregroundColor(MeV2Palette.textFaint)
                }
                DayRingView(completed: data.completed, scheduled: data.scheduled,
                            isComplete: data.isComplete, size: 44)
            }
            .frame(width: 66)
            .frame(maxHeight: .infinity, alignment: .center)

            VStack(alignment: .leading, spacing: 7) {
                HeatmapGridView(days: data.days, todayDate: data.todayDate,
                                todaySettled: data.isComplete)
                HabitDotsRow(habits: data.habits ?? [], max: 7, dot: 20)
            }
        }
    }
}

// MARK: - Per-habit cards

struct HabitSmallCard: View {
    let habit: WidgetData.HabitData
    let todayDate: String
    var cycle: Bool = false
    var index: Int = 0
    var total: Int = 0
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                HStack(spacing: 5) {
                    Text(habit.icon).font(.system(size: 14))
                    Text(habit.name).font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                }
                Spacer(minLength: 4)
                StreakView(streak: habit.streak, settled: habit.isSettled, size: 14)
            }
            StatePill(habit: habit)
            CompactGridView(days: habit.days, todayDate: todayDate,
                            todaySettled: habit.isSettled, weeks: cycle ? 7 : 8, labels: true)
            if cycle { CycleBar(index: index, total: total) }
        }
    }
}

struct HabitMediumCard: View {
    let habit: WidgetData.HabitData
    let todayDate: String
    var cycle: Bool = false
    var index: Int = 0
    var total: Int = 0
    var body: some View {
        VStack(spacing: 7) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 7) {
                    HStack(spacing: 5) {
                        Text(habit.icon).font(.system(size: 15))
                        Text(habit.name).font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white).lineLimit(1).minimumScaleFactor(0.7)
                    }
                    StatePill(habit: habit)
                    Spacer(minLength: 8)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        StreakView(streak: habit.streak, settled: habit.isSettled, size: 17)
                        Text("streak").font(.system(size: 9, weight: .semibold))
                            .foregroundColor(MeV2Palette.textFaint)
                    }
                }
                .frame(width: 104, alignment: .leading)

                HeatmapGridView(days: habit.days, todayDate: todayDate,
                                binary: true, todaySettled: habit.isSettled)
            }
            if cycle { CycleBar(index: index, total: total) }
        }
    }
}

/// Prev/next chevrons + page dots for cycle mode. Chevrons are interactive
/// widget buttons (iOS 17+) that advance the shown habit.
struct CycleBar: View {
    let index: Int
    let total: Int
    var body: some View {
        HStack(spacing: 8) {
            Button(intent: CycleHabitIntent(.previous)) {
                Image(systemName: "chevron.left").font(.system(size: 11, weight: .bold))
            }
            .buttonStyle(.plain).foregroundColor(MeV2Palette.textDim)
            Spacer()
            HStack(spacing: 4) {
                ForEach(0..<max(total, 1), id: \.self) { i in
                    Circle()
                        .fill(i == index ? MeV2Palette.accent : Color.white.opacity(0.22))
                        .frame(width: 5, height: 5)
                }
            }
            Spacer()
            Button(intent: CycleHabitIntent(.next)) {
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
            }
            .buttonStyle(.plain).foregroundColor(MeV2Palette.textDim)
        }
    }
}

// MARK: - Fallbacks

struct EmptyStateView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("Me v2").font(.system(size: 16, weight: .bold)).foregroundColor(.white)
            Text("Open the app once\nto light this up")
                .font(.system(size: 11)).multilineTextAlignment(.center)
                .foregroundColor(MeV2Palette.textDim)
        }
    }
}

struct MissingHabitView: View {
    var body: some View {
        VStack(spacing: 6) {
            Text("🗓️").font(.system(size: 22))
            Text("Habit not found —\npick one in Edit Widget")
                .font(.system(size: 11)).multilineTextAlignment(.center)
                .foregroundColor(MeV2Palette.textDim)
        }
    }
}

// MARK: - Widget

struct MeV2Widget: Widget {
    let kind: String = "MeV2Widget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectHabitIntent.self, provider: Provider()) { entry in
            MeV2WidgetEntryView(entry: entry)
                .containerBackground(MeV2Palette.background, for: .widget)
        }
        .configurationDisplayName("Habit Tracker")
        .description("Your streak, today's progress, and the chain — all habits or just one.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Previews

#Preview("All · small", as: .systemSmall) { MeV2Widget() }
timeline: { HeatmapEntry(date: .now, data: .sample(), habitId: nil) }

#Preview("All · medium", as: .systemMedium) { MeV2Widget() }
timeline: { HeatmapEntry(date: .now, data: .sample(), habitId: nil) }

#Preview("Habit · small", as: .systemSmall) { MeV2Widget() }
timeline: { HeatmapEntry(date: .now, data: .sample(), habitId: "3") }

#Preview("Habit · medium", as: .systemMedium) { MeV2Widget() }
timeline: { HeatmapEntry(date: .now, data: .sample(), habitId: "3") }
