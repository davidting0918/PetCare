// FoodsStore — group-scoped food catalog with filter / search.

import Foundation
import SwiftUI

@MainActor
final class FoodsStore: ObservableObject {
    @Published var foods: [FoodSummary] = []
    @Published var keyword: String = ""
    @Published var foodType: FoodType? = nil
    @Published var targetPet: TargetPet? = nil
    @Published var lastError: String?
    @Published var loading: Bool = false

    func load(groupId: String) async {
        loading = foods.isEmpty
        defer { loading = false }
        do {
            var q: [String: String?] = ["group_id": groupId]
            if !keyword.isEmpty { q["keyword"] = keyword }
            if let ft = foodType { q["food_type"] = ft.rawValue }
            if let tp = targetPet { q["target_pet"] = tp.rawValue }
            foods = try await APIClient.shared.get("/food/list", query: q)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    @discardableResult
    func create(_ req: CreateFoodRequest) async -> FoodDetails? {
        do {
            let d: FoodDetails = try await APIClient.shared.post("/food/create", body: req)
            await load(groupId: req.groupId)
            return d
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func details(foodId: String) async -> FoodDetails? {
        do {
            return try await APIClient.shared.get("/food/details", query: ["food_id": foodId])
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func delete(foodId: String, groupId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/food/delete",
                body: DeleteFoodRequest(foodId: foodId)) as EmptyResponse
            await load(groupId: groupId)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }
}
