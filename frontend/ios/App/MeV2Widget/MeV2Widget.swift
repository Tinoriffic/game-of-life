//
//  MeV2Widget.swift
//  The home-screen habit heatmap — the ripples replacement.
//
//  Reads the snapshot the app pushes to the App Group (no network here);
//  re-rendered on every WidgetBridge sync + at local midnight.
//

import WidgetKit
import SwiftUI

struct HeatmapEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> HeatmapEntry {
        HeatmapEntry(date: Date(), data: WidgetData.sample())
    }

    func getSnapshot(in context: Context, completion: @escaping (HeatmapEntry) -> Void) {
        completion(HeatmapEntry(date: Date(), data: WidgetData.load() ?? WidgetData.sample()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<HeatmapEntry>) -> Void) {
        let entry = HeatmapEntry(date: Date(), data: WidgetData.load())
        // One entry; ask for a re-render at next local midnight so the grid's
        // notion of "today" rolls over even if the app stays closed.
        let midnight = Calendar.current.nextDate(
            after: Date(), matching: DateComponents(hour: 0, minute: 0),
            matchingPolicy: .nextTime) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(midnight)))
    }
}

struct MeV2WidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: HeatmapEntry

    var body: some View {
        if let data = entry.data {
            switch family {
            case .systemMedium: MediumView(data: data)
            default: SmallView(data: data)
            }
        } else {
            // No snapshot yet — the app hasn't been opened since install.
            VStack(spacing: 6) {
                Text("Me v2").font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Text("Open the app once\nto light this up")
                    .font(.system(size: 11)).multilineTextAlignment(.center)
                    .foregroundColor(MeV2Palette.textDim)
            }
        }
    }
}

/// Small: streak + today ring on top, ~6 recent weeks of grid below.
struct SmallView: View {
    let data: WidgetData
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                StreakView(streak: data.dayStreak)
                Spacer()
                DayRingView(completed: data.completed, scheduled: data.scheduled,
                            isComplete: data.isComplete)
                    .frame(width: 34, height: 34)
            }
            HeatmapGridView(days: data.days, weeks: 6)
        }
    }
}

/// Medium: streak/ring summary column + the full ~17-week grid.
struct MediumView: View {
    let data: WidgetData
    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 10) {
                StreakView(streak: data.dayStreak)
                Text("day streak")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(MeV2Palette.textDim)
                    .padding(.top, -8)
                DayRingView(completed: data.completed, scheduled: data.scheduled,
                            isComplete: data.isComplete)
                    .frame(width: 40, height: 40)
            }
            HeatmapGridView(days: data.days, weeks: 17)
        }
    }
}

struct MeV2Widget: Widget {
    let kind: String = "MeV2Widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MeV2WidgetEntryView(entry: entry)
                .containerBackground(MeV2Palette.background, for: .widget)
        }
        .configurationDisplayName("Habit Heatmap")
        .description("Your streak, today's ring, and the chain — at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    MeV2Widget()
} timeline: {
    HeatmapEntry(date: .now, data: WidgetData.sample())
}

#Preview(as: .systemMedium) {
    MeV2Widget()
} timeline: {
    HeatmapEntry(date: .now, data: WidgetData.sample())
}
