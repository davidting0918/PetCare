import Foundation

@Observable
final class MealViewModel {
    var meals: [Meal] = []
    var todaySummary: TodaySummary?
    var isLoading = false
    var errorMessage: String?
    var dateFrom: String?
    var dateTo: String?

    @MainActor
    func loadMeals(petId: String) async {
        isLoading = true
        do {
            meals = try await APIClient.shared.fetchMeals(petId: petId, dateFrom: dateFrom, dateTo: dateTo)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func loadTodaySummary(petId: String) async {
        do {
            todaySummary = try await APIClient.shared.fetchTodaySummary(petId: petId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func createMeal(_ request: CreateMealRequest) async throws {
        _ = try await APIClient.shared.createMeal(request)
    }

    @MainActor
    func updateMeal(mealId: String, _ request: UpdateMealRequest) async throws {
        _ = try await APIClient.shared.updateMeal(mealId: mealId, request)
    }

    @MainActor
    func deleteMeal(mealId: String) async throws {
        try await APIClient.shared.deleteMeal(mealId: mealId)
    }

    @MainActor
    func refresh(petId: String) async {
        await loadMeals(petId: petId)
        await loadTodaySummary(petId: petId)
    }
}
