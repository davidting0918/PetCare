// MealsStore — selected-pet meal log + "today" summary.

import Foundation
import SwiftUI

@MainActor
final class MealsStore: ObservableObject {
    @Published var today: TodayMealsResponse?
    @Published var lastError: String?
    @Published var loading: Bool = false

    private func localDateString() -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .iso8601)
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }

    func loadToday(petId: String) async {
        loading = today == nil
        defer { loading = false }
        do {
            today = try await APIClient.shared.get(
                "/meal/today",
                query: ["pet_id": petId, "local_date": localDateString()]
            )
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    func loadToday(groupId: String) async {
        do {
            today = try await APIClient.shared.get(
                "/meal/today",
                query: ["group_id": groupId, "local_date": localDateString()]
            )
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    @discardableResult
    func create(_ req: CreateMealRequest) async -> MealDetails? {
        do {
            let d: MealDetails = try await APIClient.shared.post("/meal/create", body: req)
            await loadToday(petId: req.petId)
            return d
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func delete(mealId: String, petId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/meal/delete",
                body: DeleteMealRequest(mealId: mealId)) as EmptyResponse
            await loadToday(petId: petId)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }
}
