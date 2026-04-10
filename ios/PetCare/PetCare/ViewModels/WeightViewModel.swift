import Foundation

@Observable
final class WeightViewModel {
    var records: [WeightRecord] = []
    var totalRecords = 0
    var isLoading = false
    var errorMessage: String?
    var dateFrom: String?
    var dateTo: String?

    var averageWeight: Double? {
        guard !records.isEmpty else { return nil }
        return records.map(\.weightKg).reduce(0, +) / Double(records.count)
    }

    var weightChange: Double? {
        guard records.count >= 2, let first = records.last, let last = records.first else { return nil }
        return last.weightKg - first.weightKg
    }

    @MainActor
    func loadRecords(petId: String) async {
        isLoading = true
        do {
            let response = try await APIClient.shared.fetchWeights(petId: petId, start: dateFrom, end: dateTo, number: 200)
            records = response.records
            totalRecords = response.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func createWeight(_ request: CreateWeightRequest) async throws {
        _ = try await APIClient.shared.createWeight(request)
    }

    @MainActor
    func updateWeight(weightId: String, _ request: UpdateWeightRequest) async throws {
        _ = try await APIClient.shared.updateWeight(weightId: weightId, request)
    }

    @MainActor
    func deleteWeight(weightId: String) async throws {
        try await APIClient.shared.deleteWeight(weightId: weightId)
    }
}
