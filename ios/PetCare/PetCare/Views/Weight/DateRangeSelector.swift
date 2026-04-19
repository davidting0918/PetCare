import SwiftUI

struct DateRangeSelector: View {
    @Binding var startDate: Date
    @Binding var endDate: Date
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 8) {
            // Collapsed: tappable bar showing current range
            Button { withAnimation(.easeInOut(duration: 0.25)) { isExpanded.toggle() } } label: {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundStyle(Color.accentTeal)
                    Text(rangeLabel)
                        .font(.subheadline).fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption).foregroundStyle(Color.textTertiary)
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            // Expanded: quick presets + date pickers
            if isExpanded {
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        quickButton("This Month", range: thisMonthRange)
                        quickButton("3 Months", range: last3MonthsRange)
                        quickButton("6 Months", range: last6MonthsRange)
                        quickButton("All", range: allRange)
                    }

                    DatePicker("From", selection: $startDate, in: ...endDate, displayedComponents: .date)
                        .datePickerStyle(.compact)
                    DatePicker("To", selection: $endDate, in: startDate..., displayedComponents: .date)
                        .datePickerStyle(.compact)
                }
                .padding(12)
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Helpers

    private var rangeLabel: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM d, yyyy"
        return "\(fmt.string(from: startDate)) – \(fmt.string(from: endDate))"
    }

    private func quickButton(_ title: String, range: (Date, Date)) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                startDate = range.0
                endDate = range.1
            }
        } label: {
            Text(title)
                .font(.caption2).fontWeight(.medium)
                .foregroundStyle(Color.accentTeal)
                .padding(.horizontal, 8).padding(.vertical, 6)
                .background(Color.accentTeal.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }

    private var thisMonthRange: (Date, Date) {
        let now = Date()
        let cal = Calendar.current
        let start = cal.date(from: cal.dateComponents([.year, .month], from: now))!
        return (start, now)
    }

    private var last3MonthsRange: (Date, Date) {
        let now = Date()
        let start = Calendar.current.date(byAdding: .month, value: -3, to: now)!
        return (start, now)
    }

    private var last6MonthsRange: (Date, Date) {
        let now = Date()
        let start = Calendar.current.date(byAdding: .month, value: -6, to: now)!
        return (start, now)
    }

    private var allRange: (Date, Date) {
        let start = Calendar.current.date(from: DateComponents(year: 2020, month: 1, day: 1))!
        return (start, Date())
    }
}
