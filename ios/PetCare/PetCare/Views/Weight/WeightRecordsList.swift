import SwiftUI

struct WeightRecordsList: View {
    let records: [WeightRecord]
    var onSelect: (WeightRecord) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Records")
                .font(.headline).foregroundStyle(Color.textPrimary)
                .padding(.horizontal)

            if records.isEmpty {
                Text("No weight records yet")
                    .foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity).padding()
            } else {
                ForEach(Array(records.enumerated()), id: \.element.id) { index, record in
                    Button { onSelect(record) } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                HStack {
                                    Text(String(format: "%.2f kg", record.weightKg))
                                        .font(.title3).fontWeight(.bold)
                                        .foregroundStyle(Color.textPrimary)
                                    if index == 0 {
                                        Text("Latest")
                                            .font(.caption2).fontWeight(.bold)
                                            .padding(.horizontal, 6).padding(.vertical, 2)
                                            .background(Color.accentTeal.opacity(0.2))
                                            .foregroundStyle(Color.accentTeal)
                                            .clipShape(RoundedRectangle(cornerRadius: 4))
                                    }
                                }
                                if let ts = record.timestamp {
                                    Text(ts.prefix(16).replacingOccurrences(of: "T", with: " "))
                                        .font(.caption).foregroundStyle(Color.textTertiary)
                                }
                                if let notes = record.notes, !notes.isEmpty {
                                    Text(notes)
                                        .font(.caption).foregroundStyle(Color.textSecondary)
                                }
                            }
                            Spacer()
                            if let by = record.recordedByName {
                                HStack(spacing: 4) {
                                    Image(systemName: "person.fill").font(.caption2)
                                    Text(by).font(.caption)
                                }
                                .foregroundStyle(Color.textTertiary)
                            }
                            Image(systemName: "chevron.right")
                                .font(.caption).foregroundStyle(Color.textTertiary)
                        }
                        .padding()
                        .background(index == 0 ? Color.accentTeal.opacity(0.05) : Color.surface1)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .padding(.horizontal)
                    }
                }
            }
        }
    }
}
