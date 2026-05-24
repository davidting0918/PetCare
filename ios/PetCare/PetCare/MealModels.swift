// Meal DTOs — mirror backend/models/meal.py.

import Foundation

enum MealType: String, Codable, CaseIterable, Identifiable {
    case breakfast, lunch, dinner, snack
    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
}

enum ServingType: String, Codable, CaseIterable, Identifiable {
    case units, grams
    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
}

struct MealSummary: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let petName: String
    let foodId: String
    let foodBrand: String
    let foodProductName: String
    let userId: String
    let fedByName: String
    let groupId: String
    let timestamp: Date
    let mealType: MealType?
    let servingType: ServingType
    let servingAmount: Double
    let actualWeightG: Double
    let calories: Double
    let createdAt: Date
    let updatedAt: Date
}

struct MealDetails: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let petName: String
    let foodId: String
    let foodBrand: String
    let foodProductName: String
    let userId: String
    let fedByName: String
    let groupId: String
    let groupName: String
    let timestamp: Date
    let mealType: MealType?
    let servingType: ServingType
    let servingAmount: Double
    let actualWeightG: Double
    let calories: Double
    let proteinG: Double
    let fatG: Double
    let moistureG: Double
    let carbohydrateG: Double
    let notes: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct TodayMealsResponse: Codable, Equatable {
    let date: String
    let totalMeals: Int
    let totalCalories: Double
    let totalWeightG: Double
    let breakfastCount: Int
    let lunchCount: Int
    let dinnerCount: Int
    let snackCount: Int
    let petId: String?
    let petName: String?
    let dailyCalorieTarget: Int?
    let calorieTargetPercentage: Double?
    let groupId: String?
    let petsFedCount: Int?
    let meals: [MealSummary]
}

struct MealStatistics: Codable, Equatable {
    let dateFrom: String
    let dateTo: String
    let totalDays: Int
    let totalMeals: Int
    let totalCalories: Double
    let totalWeightG: Double
    let averageMealsPerDay: Double
    let averageCaloriesPerDay: Double
    let averageProteinGPerDay: Double
    let averageFatGPerDay: Double
    let averageMoistureGPerDay: Double
    let averageCarbohydrateGPerDay: Double
    let mealTypeCounts: [String: Int]
}

// ── Requests ──

struct CreateMealRequest: Codable {
    var petId: String
    var foodId: String
    var servingType: ServingType
    var servingAmount: Double
    var timestamp: Date?
    var mealType: MealType?
    var notes: String?
}

struct UpdateMealRequest: Codable {
    let mealId: String
    var foodId: String?
    var timestamp: Date?
    var mealType: MealType?
    var servingType: ServingType?
    var servingAmount: Double?
    var notes: String?
}

struct DeleteMealRequest: Codable { let mealId: String }
