import SwiftUI

struct WeightPageView: View {
    var dataStore: DataStore
    @State private var showCreateWeight = false
    @State private var selectedRecord: WeightRecord?
    @State private var startDate: Date = {
        let cal = Calendar.current
        return cal.date(from: cal.dateComponents([.year, .month], from: Date()))!
    }()
    @State private var endDate = Date()

    private var filteredRecords: [WeightRecord] {
        dataStore.weightRecords.filter { record in
            guard let ts = record.timestamp, let date = Self.parseTimestamp(ts) else { return false }
            let dayAfterEnd = Calendar.current.date(byAdding: .day, value: 1, to: Calendar.current.startOfDay(for: endDate))!
            return date >= Calendar.current.startOfDay(for: startDate) && date < dayAfterEnd
        }
    }

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
                            DateRangeSelector(startDate: $startDate, endDate: $endDate)

                            if !filteredRecords.isEmpty {
                                WeightChartCard(records: filteredRecords)
                            }

                            WeightRecordsList(records: filteredRecords) { record in
                                selectedRecord = record
                            }

                            Spacer().frame(height: 80)
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
            .sheet(item: $selectedRecord) { record in
                WeightDetailSheet(dataStore: dataStore, record: record) {
                    if let petId = dataStore.currentPetId {
                        Task { await dataStore.refreshWeights(petId: petId) }
                    }
                }
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
            }
        }
    }

    static func parseTimestamp(_ ts: String) -> Date? {
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = fmt.date(from: ts) { return d }
        fmt.formatOptions = [.withInternetDateTime]
        return fmt.date(from: ts)
    }
}
