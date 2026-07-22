import SwiftUI

/// Always-dark palette mirroring TodayPage.css — the widget is a window into
/// the app, not a system-adaptive surface.
enum MeV2Palette {
    static let background = Color(red: 0.11, green: 0.12, blue: 0.15)   // #1C1F26
    static let cellNone = Color.white.opacity(0.07)
    static let cellSome = Color(red: 1.0, green: 0.843, blue: 0.0).opacity(0.32)     // gold
    static let cellPartial = Color(red: 1.0, green: 0.624, blue: 0.263).opacity(0.65) // #FF9F43
    static let cellComplete = Color(red: 0.024, green: 0.839, blue: 0.627)            // #06D6A0
    static let streakOrange = Color(red: 1.0, green: 0.624, blue: 0.263)
    static let ringTrack = Color.white.opacity(0.12)
    static let ringGold = Color(red: 1.0, green: 0.843, blue: 0.0)
    static let textDim = Color.white.opacity(0.55)

    static func cell(for day: WidgetData.Day) -> Color {
        switch day.status {
        case "complete": return cellComplete
        case "partial": return cellPartial
        default: return day.count > 0 ? cellSome : cellNone
        }
    }
}

/// GitHub-style week grid: columns = weeks (oldest left), rows = days
/// (chronological top→bottom), exactly like MiniHeatmap.js.
struct HeatmapGridView: View {
    let days: [WidgetData.Day]
    let weeks: Int
    var spacing: CGFloat = 2.5

    var body: some View {
        let window = Array(days.suffix(weeks * 7))
        let columns = stride(from: 0, to: window.count, by: 7).map {
            Array(window[$0..<min($0 + 7, window.count)])
        }
        GeometryReader { geo in
            let cols = CGFloat(max(columns.count, 1))
            let cellW = (geo.size.width - spacing * (cols - 1)) / cols
            let cellH = (geo.size.height - spacing * 6) / 7
            let cell = min(cellW, cellH)
            let gridW = cell * cols + spacing * (cols - 1)
            let gridH = cell * 7 + spacing * 6

            HStack(alignment: .top, spacing: spacing) {
                ForEach(columns.indices, id: \.self) { ci in
                    VStack(spacing: spacing) {
                        ForEach(columns[ci], id: \.date) { day in
                            RoundedRectangle(cornerRadius: cell * 0.23)
                                .fill(MeV2Palette.cell(for: day))
                                .frame(width: cell, height: cell)
                        }
                    }
                }
            }
            .frame(width: gridW, height: gridH)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }
}

/// Today's completion ring (completed/scheduled), gold in progress, green when
/// the day is complete — same semantics as the app's day-ring.
struct DayRingView: View {
    let completed: Int
    let scheduled: Int
    let isComplete: Bool
    var lineWidth: CGFloat = 4

    var body: some View {
        let pct = scheduled > 0 ? Double(completed) / Double(scheduled) : 0
        ZStack {
            Circle().stroke(MeV2Palette.ringTrack, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: pct)
                .stroke(isComplete ? MeV2Palette.cellComplete : MeV2Palette.ringGold,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(completed)/\(scheduled)")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.white)
                .minimumScaleFactor(0.6)
        }
    }
}

struct StreakView: View {
    let streak: Int
    var body: some View {
        HStack(spacing: 3) {
            Text("🔥").font(.system(size: 14))
            Text("\(streak)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundColor(MeV2Palette.streakOrange)
        }
    }
}
