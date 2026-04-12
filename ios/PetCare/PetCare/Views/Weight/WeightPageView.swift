import SwiftUI
import Charts

struct WeightPageView: View {
    var dataStore: DataStore
    @State private var showCreateWeight = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Weight", dataStore: dataStore) {
                            if let petId = dataStore.currentPetId {
                                await dataStore.refreshWeights(petId: petId)
                            }
                        }

                        if dataStore.selectedPet != nil {
                            if !dataStore.weightRecords.isEmpty {
                                WeightChartCard(records: dataStore.weightRecords)
                                WeightStatsRow(dataStore: dataStore)
                            }
                            WeightRecordsList(records: dataStore.weightRecords)
                        } else {
                            Text("Select a pet to view weight records")
                                .foregroundStyle(Color.textTertiary)
                                .padding(.top, 40)
                        }
                    }
                }

                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button { showCreateWeight = true } label: {
                            Image(systemName: "plus")
                                .font(.title2).fontWeight(.bold)
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.accentTeal)
                                .clipShape(Circle())
                                .shadow(color: Color.accentTeal.opacity(0.4), radius: 8, y: 4)
                        }
                        .padding(.trailing, 20).padding(.bottom, 20)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateWeight) {
                CreateWeightSheet(dataStore: dataStore) {
                    if let petId = dataStore.currentPetId {
                        Task { await dataStore.refreshWeights(petId: petId) }
                    }
                }
            }
        }
    }
}

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

struct WeightStatsRow: View {
    let dataStore: DataStore

    var body: some View {
        HStack(spacing: 12) {
            StatCard(title: "Records", value: "\(dataStore.weightTotal)", icon: "number", color: .accentBlue)
            StatCard(title: "Average", value: dataStore.averageWeight.map { String(format: "%.1f kg", $0) } ?? "—", icon: "divide", color: .accentPurple)
            StatCard(title: "Change", value: dataStore.weightChange.map { String(format: "%+.1f kg", $0) } ?? "—", icon: "arrow.up.arrow.down", color: .accentTeal)
        }
        .padding(.horizontal)
    }
}

struct WeightRecordsList: View {
    let records: [WeightRecord]

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

struct CreateWeightSheet: View {
    var dataStore: DataStore
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var weightStr = ""
    @State private var notes = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Weight") {
                        TextField("Weight (kg)", text: $weightStr)
                            .keyboardType(.decimalPad)
                    }
                    Section("Notes") {
                        TextField("Optional notes", text: $notes)
                    }
                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(Color.danger) }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Add Weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }.disabled(weightStr.isEmpty || isCreating)
                }
            }
        }
    }

    private func save() {
        guard let petId = dataStore.selectedPet?.id, let weight = Double(weightStr) else { return }
        isCreating = true
        Task {
            do {
                let request = CreateWeightRequest(petId: petId, weightKg: weight, timestamp: nil, notes: notes.isEmpty ? nil : notes)
                _ = try await APIClient.shared.createWeight(request)
                onCreated()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isCreating = false
        }
    }
}
