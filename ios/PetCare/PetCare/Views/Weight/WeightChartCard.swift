import SwiftUI
import Charts

struct WeightChartCard: View {
    let records: [WeightRecord]

    private var chartData: [(date: Date, weight: Double)] {
        records.reversed().compactMap { record in
            guard let ts = record.timestamp, let date = WeightPageView.parseTimestamp(ts) else { return nil }
            return (date: date, weight: record.weightKg)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Weight Trend")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(records.count) records")
                    .font(.caption).foregroundStyle(Color.textTertiary)
            }

            Chart(chartData, id: \.date) { item in
                LineMark(
                    x: .value("Date", item.date),
                    y: .value("Weight", item.weight)
                )
                .foregroundStyle(Color.accentTeal)
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Date", item.date),
                    y: .value("Weight", item.weight)
                )
                .foregroundStyle(Color.accentTeal)
                .symbolSize(30)
            }
            .chartXAxis {
                AxisMarks(values: .automatic(desiredCount: 5)) { value in
                    AxisValueLabel(format: .dateTime.month(.abbreviated).day())
                    AxisGridLine().foregroundStyle(Color.borderSubtle)
                }
            }
            .chartYAxis {
                AxisMarks { value in
                    AxisValueLabel()
                    AxisGridLine().foregroundStyle(Color.borderSubtle)
                }
            }
            .frame(height: 200)
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}
