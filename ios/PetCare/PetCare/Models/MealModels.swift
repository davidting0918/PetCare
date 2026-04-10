import Foundation

struct Meal: Codable, Identifiable {
    let id: String
    let petId: String?
    let petName: String?
    let foodId: String?
    let foodDetails: MealFoodDetails?
    let servingType: String?
    let servingAmount: Double?
    let actualWeightG: Double?
    let calories: Double?
    let recordedBy: String?
    let fedAt: String?
    let mealType: String?
    let notes: String?
    let groupId: String?

    enum CodingKeys: String, CodingKey {
        case id, calories, notes
        case petId = "pet_id"
        case petName = "pet_name"
        case foodId = "food_id"
        case foodDetails = "food_details"
        case servingType = "serving_type"
        case servingAmount = "serving_amount"
        case actualWeightG = "actual_weight_g"
        case recordedBy = "recorded_by"
        case fedAt = "fed_at"
        case mealType = "meal_type"
        case groupId = "group_id"
    }
}

struct MealFoodDetails: Codable {
    let brand: String?
    let productName: String?
    let foodType: String?
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case brand
        case productName = "product_name"
        case foodType = "food_type"
        case photoUrl = "photo_url"
    }
}

struct TodaySummary: Codable {
    let date: String?
    let petMeals: [Meal]?
    let totalCalories: Double?
    let calorieTarget: Int?
    let targetAchievementPercentage: Double?
    let mealDistribution: [String: Int]?
    let feedingTimeline: [[String: String]]?

    enum CodingKeys: String, CodingKey {
        case date
        case petMeals = "pet_meals"
        case totalCalories = "total_calories"
        case calorieTarget = "calorie_target"
        case targetAchievementPercentage = "target_achievement_percentage"
        case mealDistribution = "meal_distribution"
        case feedingTimeline = "feeding_timeline"
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
