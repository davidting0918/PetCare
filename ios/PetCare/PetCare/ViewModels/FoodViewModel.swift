import Foundation

@Observable
final class FoodViewModel {
    var foods: [Food] = []
    var selectedFood: Food?
    var isLoading = false
    var errorMessage: String?

    @MainActor
    func loadFoods(groupId: String) async {
        isLoading = true
        do {
            foods = try await APIClient.shared.fetchFoods(groupId: groupId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func loadFoodDetails(foodId: String) async {
        do {
            selectedFood = try await APIClient.shared.fetchFoodDetails(foodId: foodId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func createFood(groupId: String, _ request: CreateFoodRequest) async throws -> Food {
        let food = try await APIClient.shared.createFood(groupId: groupId, request)
        await loadFoods(groupId: groupId)
        return food
    }

    @MainActor
    func updateFood(foodId: String, _ request: UpdateFoodRequest, groupId: String) async throws {
        _ = try await APIClient.shared.updateFood(foodId: foodId, request)
        await loadFoods(groupId: groupId)
    }

    @MainActor
    func deleteFood(foodId: String, groupId: String) async throws {
        try await APIClient.shared.deleteFood(foodId: foodId)
        await loadFoods(groupId: groupId)
    }
}
