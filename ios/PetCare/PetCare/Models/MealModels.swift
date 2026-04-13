import Foundation

struct Meal: Codable, Identifiable {
    let id: String
    let petId: String?
    let petName: String?
    let foodId: String?
    let foodName: String?         // "Brand - Product Name" (from list API)
    let foodBrand: String?        // (from details API only)
    let foodProductName: String?  // (from details API only)
    let userId: String?
    let fedByName: String?
    let servingType: String?
    let servingAmount: Double?
    let actualWeightG: Double?
    let calories: Double?
    let timestamp: String?        // API returns "timestamp", not "fed_at"
    let mealType: String?
    let notes: String?
    let groupId: String?

    enum CodingKeys: String, CodingKey {
        case id, calories, notes, timestamp
        case petId = "pet_id"
        case petName = "pet_name"
        case foodId = "food_id"
        case foodName = "food_name"
        case foodBrand = "food_brand"
        case foodProductName = "food_product_name"
        case userId = "user_id"
        case fedByName = "fed_by_name"
        case servingType = "serving_type"
        case servingAmount = "serving_amount"
        case actualWeightG = "actual_weight_g"
        case mealType = "meal_type"
        case groupId = "group_id"
    }

    /// Display name: prefer food_name (list API), fallback to brand + product (detail API)
    var displayFoodName: String {
        if let fn = foodName, !fn.isEmpty { return fn }
        let parts = [foodBrand, foodProductName].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? "Unknown Food" : parts.joined(separator: " - ")
    }

    /// Date string for grouping (YYYY-MM-DD)
    var dateString: String {
        String(timestamp?.prefix(10) ?? "")
    }

    /// Short time display (full: "2026-04-12 14:30")
    var timeString: String {
        guard let ts = timestamp, ts.count >= 16 else { return "" }
        return String(ts.prefix(16)).replacingOccurrences(of: "T", with: " ")
    }

    /// 24-hour time only (e.g. "14:30")
    var time24h: String {
        guard let ts = timestamp, let tIdx = ts.firstIndex(of: "T") else { return "" }
        return String(ts[ts.index(after: tIdx)...].prefix(5))
    }
}

struct TodaySummary: Codable {
    let date: String?
    let petMeals: [Meal]?
    let totalCalories: Double?
    let calorieTarget: Int?
    let targetAchievementPercentage: Double?
    let mealDistribution: [String: Int]?

    enum CodingKeys: String, CodingKey {
        case date
        case petMeals = "pet_meals"
        case totalCalories = "total_calories"
        case calorieTarget = "calorie_target"
        case targetAchievementPercentage = "target_achievement_percentage"
        case mealDistribution = "meal_distribution"
    }
}

struct MealSummary: Codable {
    let totalMeals: Int?
    let totalCalories: Double?
    let dailyAverageCalories: Double?

    enum CodingKeys: String, CodingKey {
        case totalMeals = "total_meals"
        case totalCalories = "total_calories"
        case dailyAverageCalories = "daily_average_calories"
    }
}

struct CreateMealRequest: Codable {
    let petId: String
    let foodId: String
    let mealType: String?
    let servingType: String?
    let servingAmount: Double?
    let fedAt: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case notes
        case petId = "pet_id"
        case foodId = "food_id"
        case mealType = "meal_type"
        case servingType = "serving_type"
        case servingAmount = "serving_amount"
        case fedAt = "fed_at"
    }
}

struct UpdateMealRequest: Codable {
    var foodId: String?
    var mealType: String?
    var servingType: String?
    var servingAmount: Double?
    var fedAt: String?
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case notes
        case foodId = "food_id"
        case mealType = "meal_type"
        case servingType = "serving_type"
        case servingAmount = "serving_amount"
        case fedAt = "fed_at"
    }
}
