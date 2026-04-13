import SwiftUI
import Charts

struct WeightChartCard: View {
    let records: [WeightRecord]

    var chartRecords: [WeightRecord] {
        Array(records.reversed().suffix(30))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Weight Trend")
                .font(.headline).foregroundStyle(Color.textPrimary)

            Chart(chartRecords, id: \.id) { record in
                LineMark(
                    x: .value("Date", record.timestamp?.prefix(10).description ?? ""),
                    y: .value("Weight", record.weightKg)
                )
                .foregroundStyle(Color.accentTeal)
                .interpolationMethod(.catmullRom)

                PointMark(
                    x: .value("Date", record.timestamp?.prefix(10).description ?? ""),
                    y: .value("Weight", record.weightKg)
                )
                .foregroundStyle(Color.accentTeal)
                .symbolSize(30)
            }
            .chartYAxis {
                AxisMarks { AxisGridLine().foregroundStyle(Color.borderSubtle) }
            }
            .frame(height: 200)
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}
