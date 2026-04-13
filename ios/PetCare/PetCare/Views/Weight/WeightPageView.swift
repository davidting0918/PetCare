import SwiftUI

struct WeightPageView: View {
    var dataStore: DataStore
    @State private var showCreateWeight = false
    @State private var selectedRecord: WeightRecord?

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
                            WeightRecordsList(records: dataStore.weightRecords) { record in
                                selectedRecord = record
                            }
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
