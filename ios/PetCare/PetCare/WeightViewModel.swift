// WeightsStore — selected-pet weight history with chart-friendly accessors.

import Foundation
import SwiftUI

@MainActor
final class WeightsStore: ObservableObject {
    @Published var records: [WeightSummary] = []
    @Published var lastError: String?
    @Published var loading: Bool = false

    func load(petId: String) async {
        loading = records.isEmpty
        defer { loading = false }
        do {
            let resp: WeightListResponse = try await APIClient.shared.get(
                "/weight/list",
                query: ["pet_id": petId, "number": "200", "order_by": "timestamp", "order_direction": "asc"]
            )
            records = resp.records
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    @discardableResult
    func create(_ req: CreateWeightRequest) async -> WeightDetails? {
        do {
            let d: WeightDetails = try await APIClient.shared.post("/weight/create", body: req)
            await load(petId: req.petId)
            return d
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func delete(weightId: String, petId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/weight/delete",
                body: DeleteWeightRequest(weightId: weightId)) as EmptyResponse
            await load(petId: petId)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    /// Convenience: latest entry, or nil.
    var latest: WeightSummary? { records.max(by: { $0.timestamp < $1.timestamp }) }

    /// Convenience: weight 90 days ago (or earliest available within window).
    func priorWeight(daysAgo: Int = 90) -> Double? {
        let cutoff = Calendar.current.date(byAdding: .day, value: -daysAgo, to: Date()) ?? Date()
        return records.first(where: { $0.timestamp >= cutoff })?.weight
    }
}
