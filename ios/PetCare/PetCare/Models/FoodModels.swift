import Foundation

struct Food: Codable, Identifiable {
    let id: String
    let brand: String?
    let productName: String?
    let foodType: String?
    let targetPet: String?
    let unitWeightG: Double?
    let caloriesPer100g: Double?
    let caloriesPerUnit: Double?
    let proteinPercentage: Double?
    let fatPercentage: Double?
    let moisturePercentage: Double?
    let carbohydratePercentage: Double?
    let photoUrl: String?
    let groupId: String?

    enum CodingKeys: String, CodingKey {
        case id, brand
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeightG = "unit_weight_g"
        case caloriesPer100g = "calories_per_100g"
        case caloriesPerUnit = "calories_per_unit"
        case proteinPercentage = "protein_percentage"
        case fatPercentage = "fat_percentage"
        case moisturePercentage = "moisture_percentage"
        case carbohydratePercentage = "carbohydrate_percentage"
        case photoUrl = "photo_url"
        case groupId = "group_id"
    }

    var displayName: String {
        [brand, productName].compactMap { $0 }.joined(separator: " - ")
    }
}

struct CreateFoodRequest: Codable {
    let brand: String
    let productName: String
    let foodType: String?
    let targetPet: String?
    let unitWeightG: Double?
    let caloriesPer100g: Double?
    let proteinPercentage: Double?
    let fatPercentage: Double?
    let moisturePercentage: Double?
    let carbohydratePercentage: Double?

    enum CodingKeys: String, CodingKey {
        case brand
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeightG = "unit_weight_g"
        case caloriesPer100g = "calories_per_100g"
        case proteinPercentage = "protein_percentage"
        case fatPercentage = "fat_percentage"
        case moisturePercentage = "moisture_percentage"
        case carbohydratePercentage = "carbohydrate_percentage"
    }
}

struct UpdateFoodRequest: Codable {
    var brand: String?
    var productName: String?
    var foodType: String?
    var targetPet: String?
    var unitWeightG: Double?
    var caloriesPer100g: Double?
    var proteinPercentage: Double?
    var fatPercentage: Double?
    var moisturePercentage: Double?
    var carbohydratePercentage: Double?

    enum CodingKeys: String, CodingKey {
        case brand
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeightG = "unit_weight_g"
        case caloriesPer100g = "calories_per_100g"
        case proteinPercentage = "protein_percentage"
        case fatPercentage = "fat_percentage"
        case moisturePercentage = "moisture_percentage"
        case carbohydratePercentage = "carbohydrate_percentage"
    }
}
