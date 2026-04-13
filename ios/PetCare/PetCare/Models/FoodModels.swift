import Foundation

struct Food: Codable, Identifiable {
    let id: String
    let brand: String?
    let productName: String?
    let foodType: String?
    let targetPet: String?
    let unitWeight: Double?
    let calories: Double?
    let caloriesPerUnit: Double?
    let protein: Double?
    let fat: Double?
    let moisture: Double?
    let carbohydrate: Double?
    let photoUrl: String?
    let groupId: String?
    let creatorId: String?
    let creatorName: String?
    let groupName: String?

    enum CodingKeys: String, CodingKey {
        case id, brand, calories, protein, fat, moisture, carbohydrate
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeight = "unit_weight"
        case caloriesPerUnit = "calories_per_unit"
        case photoUrl = "photo_url"
        case groupId = "group_id"
        case creatorId = "creator_id"
        case creatorName = "creator_name"
        case groupName = "group_name"
    }

    var displayName: String {
        [brand, productName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " - ")
    }
}

struct CreateFoodRequest: Codable {
    let brand: String
    let productName: String
    let foodType: String       // "wet_food" or "dry_food"
    let targetPet: String      // "dog", "cat", etc.
    let unitWeight: Double     // required, grams per unit
    let calories: Double       // required, kcal per 100g
    let protein: Double        // required, percentage
    let fat: Double            // required, percentage
    let moisture: Double       // required, percentage
    let carbohydrate: Double   // required, percentage

    enum CodingKeys: String, CodingKey {
        case brand, calories, protein, fat, moisture, carbohydrate
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeight = "unit_weight"
    }
}

struct UpdateFoodRequest: Codable {
    var brand: String?
    var productName: String?
    var foodType: String?
    var targetPet: String?
    var unitWeight: Double?
    var calories: Double?
    var protein: Double?
    var fat: Double?
    var moisture: Double?
    var carbohydrate: Double?

    enum CodingKeys: String, CodingKey {
        case brand, calories, protein, fat, moisture, carbohydrate
        case productName = "product_name"
        case foodType = "food_type"
        case targetPet = "target_pet"
        case unitWeight = "unit_weight"
    }
}
