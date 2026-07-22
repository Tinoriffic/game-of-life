import SwiftUI

/// Always-dark palette mirroring TodayPage.css — the widget is a window into
/// the app, not a system-adaptive surface.
enum MeV2Palette {
    static let bgTop = Color(red: 0.137, green: 0.152, blue: 0.204)   // #232734
    static let bgBottom = Color(red: 0.102, green: 0.114, blue: 0.149) // #1A1D26

    // "Mint Circuit": one green intensity ramp, dark → bright, so a fuller day
    // reads as a brighter cell (cleaner than the old three-hue mix).
    static let cellNone = Color(red: 0.102, green: 0.161, blue: 0.141)   // #1a2924
    static let cellLow  = Color(red: 0.094, green: 0.420, blue: 0.322)   // #186b52
    static let cellMid  = Color(red: 0.078, green: 0.694, blue: 0.518)   // #14b184
    static let cellHigh = Color(red: 0.184, green: 0.941, blue: 0.698)   // #2ff0b2

    static let accent = Color(red: 1.0, green: 0.812, blue: 0.227)       // gold #ffcf3a — attention/streak
    static let success = cellHigh                                        // mint — done
    // back-compat aliases used by the atom views (pending=gold, done=mint)
    static let amber = accent
    static let green = success
    static let gold = accent
    static let ringTrack = Color.white.opacity(0.12)
    static let textDim = Color.white.opacity(0.55)
    static let textFaint = Color.white.opacity(0.36)

    static let background = LinearGradient(
        colors: [bgTop, bgBottom], startPoint: .topLeading, endPoint: .bottomTrailing)

    static func overallCell(_ day: WidgetData.Day) -> Color {
        switch day.status {
        case "complete": return cellHigh
        case "partial": return cellMid
        default: return day.count > 0 ? cellLow : cellNone
        }
    }

    static func habitCell(_ day: WidgetData.Day) -> Color {
        (day.count > 0 || day.status == "complete") ? cellHigh : cellNone
    }

    static func cellFill(_ day: WidgetData.Day?, binary: Bool) -> Color {
        guard let day = day else { return .clear }
        return binary ? habitCell(day) : overallCell(day)
    }
}

/// The today-cell emphasis, shared by every grid: amber (pending) or green
/// (settled), thicker and glowing so it's the glance target.
struct TodayOutline: View {
    let corner: CGFloat
    let settled: Bool
    var body: some View {
        let color = settled ? MeV2Palette.green : MeV2Palette.amber
        RoundedRectangle(cornerRadius: corner)
            .stroke(color, lineWidth: 1.8)
            .shadow(color: color.opacity(0.75), radius: 2.5)
    }
}

// MARK: - Weekday alignment

/// A GitHub-style grid where every row is a fixed weekday (honoring the user's
/// locale first-weekday) and every column is a calendar week. Cells are placed
/// by their real date, so weekday row labels are always truthful.
struct AlignedWeeks {
    var columns: [[WidgetData.Day?]] = []   // each column has 7 slots, indexed by weekday-row
    var rowLabels: [String] = []            // 7 single-letter labels, in row order
    var todayCell: (col: Int, row: Int)?

    static func build(from days: [WidgetData.Day], todayDate: String) -> AlignedWeeks {
        let cal = Calendar.current
        let firstWeekday = cal.firstWeekday
        let parser = DateFormatter()
        parser.calendar = cal
        parser.locale = Locale(identifier: "en_US_POSIX")
        parser.dateFormat = "yyyy-MM-dd"

        func row(for date: Date) -> Int {
            (cal.component(.weekday, from: date) - firstWeekday + 7) % 7
        }
        func weekStart(for date: Date) -> Date {
            cal.date(byAdding: .day, value: -row(for: date), to: cal.startOfDay(for: date))!
        }

        var byWeek: [Date: [Int: WidgetData.Day]] = [:]
        var order: [Date] = []
        for day in days {
            guard let date = parser.date(from: day.date) else { continue }
            let ws = weekStart(for: date)
            if byWeek[ws] == nil { byWeek[ws] = [:]; order.append(ws) }
            byWeek[ws]?[row(for: date)] = day
        }
        order.sort()

        var result = AlignedWeeks()
        for (ci, ws) in order.enumerated() {
            let slots = byWeek[ws] ?? [:]
            result.columns.append((0..<7).map { slots[$0] })
            if let day = slots.first(where: { $0.value.date == todayDate }) {
                result.todayCell = (ci, day.key)
            }
        }
        let symbols = cal.veryShortWeekdaySymbols   // ["S","M","T","W","T","F","S"], Sunday=0
        result.rowLabels = (0..<7).map { symbols[(firstWeekday - 1 + $0) % 7] }
        return result
    }
}

// MARK: - Full grid (medium)

/// Week grid with weekday row labels down the left edge. `binary` uses the
/// green/none scale for a single habit's chain.
struct HeatmapGridView: View {
    let days: [WidgetData.Day]
    let todayDate: String
    var binary: Bool = false
    var todaySettled: Bool = false
    var spacing: CGFloat = 2.5

    var body: some View {
        let aligned = AlignedWeeks.build(from: days, todayDate: todayDate)
        GeometryReader { geo in
            let labelW: CGFloat = 9
            let cols = CGFloat(max(aligned.columns.count, 1))
            let availW = geo.size.width - labelW - 3
            let cellW = (availW - spacing * (cols - 1)) / cols
            let cellH = (geo.size.height - spacing * 6) / 7
            let cell = max(3, min(cellW, cellH))

            HStack(alignment: .center, spacing: 3) {
                VStack(spacing: spacing) {
                    ForEach(0..<7, id: \.self) { r in
                        Text(aligned.rowLabels[r])
                            .font(.system(size: 7, weight: .bold))
                            .foregroundColor(MeV2Palette.textFaint)
                            .frame(width: labelW, height: cell)
                    }
                }
                HStack(alignment: .top, spacing: spacing) {
                    ForEach(aligned.columns.indices, id: \.self) { ci in
                        VStack(spacing: spacing) {
                            ForEach(0..<7, id: \.self) { r in
                                cellView(aligned.columns[ci][r],
                                         isToday: aligned.todayCell.map { $0 == (ci, r) } ?? false,
                                         size: cell)
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func cellView(_ day: WidgetData.Day?, isToday: Bool, size: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: size * 0.23)
            .fill(MeV2Palette.cellFill(day, binary: binary))
            .frame(width: size, height: size)
            .overlay {
                if isToday { TodayOutline(corner: size * 0.23, settled: todaySettled) }
            }
    }
}

// MARK: - Two-week strip (small, all-habits)

/// Last week over this week, sharing one labeled weekday axis at the bottom —
/// "am I keeping pace vs. last week?" at a glance.
struct TwoWeekStripView: View {
    let days: [WidgetData.Day]
    let todayDate: String
    var binary: Bool = false
    var todaySettled: Bool = false

    var body: some View {
        let aligned = AlignedWeeks.build(from: days, todayDate: todayDate)
        let weeks = Array(aligned.columns.suffix(2))          // [lastWeek, thisWeek]
        let todayCol = aligned.todayCell.map { $0.col }
        let lastTwoStart = aligned.columns.count - weeks.count

        GeometryReader { geo in
            let gap: CGFloat = 4
            let cell = (geo.size.width - gap * 6) / 7
            VStack(spacing: 4) {
                ForEach(weeks.indices, id: \.self) { wi in
                    HStack(spacing: gap) {
                        ForEach(0..<7, id: \.self) { r in
                            let isToday = todayCol == (lastTwoStart + wi)
                                && aligned.todayCell?.row == r
                            rowCell(weeks[wi][r], isToday: isToday, size: cell)
                        }
                    }
                }
                HStack(spacing: gap) {
                    ForEach(0..<7, id: \.self) { r in
                        Text(aligned.rowLabels[r])
                            .font(.system(size: 7.5, weight: .bold))
                            .foregroundColor(MeV2Palette.textFaint)
                            .frame(width: cell)
                    }
                }
            }
            .frame(maxHeight: .infinity, alignment: .bottom)
        }
    }

    @ViewBuilder
    private func rowCell(_ day: WidgetData.Day?, isToday: Bool, size: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: size * 0.28)
            .fill(day == nil ? MeV2Palette.cellNone.opacity(0.35)
                  : MeV2Palette.cellFill(day, binary: binary))
            .frame(width: size, height: size)
            .overlay {
                if isToday { TodayOutline(corner: size * 0.28, settled: todaySettled) }
            }
    }
}

// MARK: - Compact grid (small, per-habit)

/// A recent-weeks grid for the per-habit small card, with an optional weekday
/// label column (grid slides right to make room).
struct CompactGridView: View {
    let days: [WidgetData.Day]
    let todayDate: String
    var binary: Bool = true
    var todaySettled: Bool = false
    var weeks: Int = 9
    var labels: Bool = false

    var body: some View {
        let aligned = AlignedWeeks.build(from: days, todayDate: todayDate)
        let cols = Array(aligned.columns.suffix(weeks))
        let base = aligned.columns.count - cols.count
        GeometryReader { geo in
            let spacing: CGFloat = 2.5
            let labelW: CGFloat = labels ? 8 : 0
            let labelGap: CGFloat = labels ? 3 : 0
            let n = CGFloat(max(cols.count, 1))
            let cellW = (geo.size.width - labelW - labelGap - spacing * (n - 1)) / n
            let cellH = (geo.size.height - spacing * 6) / 7
            let cell = max(3, min(cellW, cellH))
            HStack(alignment: .top, spacing: labelGap) {
                if labels {
                    VStack(spacing: spacing) {
                        ForEach(0..<7, id: \.self) { r in
                            Text(aligned.rowLabels[r])
                                .font(.system(size: 6.5, weight: .bold))
                                .foregroundColor(MeV2Palette.textFaint)
                                .frame(width: labelW, height: cell)
                        }
                    }
                }
                HStack(alignment: .top, spacing: spacing) {
                    ForEach(cols.indices, id: \.self) { ci in
                        VStack(spacing: spacing) {
                            ForEach(0..<7, id: \.self) { r in
                                let isToday = aligned.todayCell.map { $0 == (base + ci, r) } ?? false
                                let day = cols[ci][r]
                                RoundedRectangle(cornerRadius: cell * 0.23)
                                    .fill(MeV2Palette.cellFill(day, binary: binary))
                                    .frame(width: cell, height: cell)
                                    .overlay {
                                        if isToday { TodayOutline(corner: cell * 0.23, settled: todaySettled) }
                                    }
                            }
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        }
    }
}

// MARK: - Atoms

struct DayRingView: View {
    let completed: Int
    let scheduled: Int
    let isComplete: Bool
    var size: CGFloat = 40
    var lineWidth: CGFloat = 4.5

    var body: some View {
        let pct = scheduled > 0 ? min(1, Double(completed) / Double(scheduled)) : 0
        ZStack {
            Circle().stroke(MeV2Palette.ringTrack, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: pct)
                .stroke(isComplete ? MeV2Palette.green : MeV2Palette.gold,
                        style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .shadow(color: isComplete ? MeV2Palette.green.opacity(0.7) : .clear, radius: 3)
            Text("\(completed)/\(scheduled)")
                .font(.system(size: size * 0.28, weight: .bold, design: .rounded))
                .foregroundColor(isComplete ? MeV2Palette.green : .white)
                .minimumScaleFactor(0.6)
        }
        .frame(width: size, height: size)
    }
}

struct StreakView: View {
    let streak: Int
    var settled: Bool = true
    var size: CGFloat = 19
    var body: some View {
        HStack(spacing: 3) {
            Text("🔥").font(.system(size: size * 0.74))
            Text("\(streak)")
                .font(.system(size: size, weight: .heavy, design: .rounded))
                .foregroundColor(settled ? MeV2Palette.amber : MeV2Palette.amber.opacity(0.55))
                .monospacedDigit()
        }
        .fixedSize()
    }
}

/// Daily-habit checklist row: one square per daily habit, capped with +N.
struct HabitDotsRow: View {
    let habits: [WidgetData.HabitData]
    var max: Int = 4
    var dot: CGFloat = 20

    var body: some View {
        let dailies = habits.filter { !$0.isWeekly }
        let shown = Array(dailies.prefix(max))
        let overflow = dailies.count - shown.count
        HStack(spacing: 5) {
            ForEach(shown, id: \.id) { h in
                ZStack {
                    RoundedRectangle(cornerRadius: dot * 0.33)
                        .fill(h.doneToday ? MeV2Palette.green.opacity(0.14) : Color.white.opacity(0.06))
                        .overlay(
                            RoundedRectangle(cornerRadius: dot * 0.33)
                                .stroke(h.doneToday ? MeV2Palette.green.opacity(0.8) : MeV2Palette.amber.opacity(0.55),
                                        lineWidth: 1.5))
                    Text(h.icon).font(.system(size: dot * 0.52))
                    if !h.doneToday {
                        Circle().fill(MeV2Palette.amber)
                            .frame(width: dot * 0.32, height: dot * 0.32)
                            .overlay(Circle().stroke(MeV2Palette.bgBottom, lineWidth: 1.5))
                            .offset(x: dot * 0.42, y: -dot * 0.42)
                    }
                }
                .frame(width: dot, height: dot)
            }
            if overflow > 0 {
                Text("+\(overflow)")
                    .font(.system(size: dot * 0.42, weight: .bold))
                    .foregroundColor(MeV2Palette.textFaint)
                    .frame(width: dot, height: dot)
                    .background(RoundedRectangle(cornerRadius: dot * 0.33).stroke(Color.white.opacity(0.14), lineWidth: 1.5))
            }
        }
    }
}

struct StatePill: View {
    let habit: WidgetData.HabitData
    var body: some View {
        let settled = habit.isSettled
        let text: String = {
            if habit.isWeekly { return "\(habit.weekCount) of \(habit.timesPerWeek) this week" }
            return settled ? "Done today" : "Not yet today"
        }()
        HStack(spacing: 5) {
            Text(settled ? "✓" : "●").font(.system(size: 9, weight: .black))
            Text(text).font(.system(size: 10, weight: .bold)).lineLimit(1)
        }
        .fixedSize(horizontal: true, vertical: false)
        .foregroundColor(settled ? MeV2Palette.green : MeV2Palette.amber)
        .padding(.horizontal, 9).padding(.vertical, 3.5)
        .background(Capsule().fill((settled ? MeV2Palette.green : MeV2Palette.amber).opacity(0.16)))
    }
}
