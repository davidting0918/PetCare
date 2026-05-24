// Food DTOs — mirror backend/models/food.py.

import Foundation

enum FoodType: String, Codable, CaseIterable, Identifiable {
    case wetFood = "wet_food"
    case dryFood = "dry_food"
    case other
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .wetFood: return "Wet"
        case .dryFood: return "Dry"
        case .other:   return "Other"
        }
    }
}

enum TargetPet: String, Codable, CaseIterable, Identifiable {
    case dog, cat, bird, fish, rabbit, other
    var id: String { rawValue }
    var displayName: String { rawValue.capitalized }
    var emoji: String {
        switch self {
        case .dog: return "🐶"
        case .cat: return "🐱"
        case .bird: return "🐦"
        case .fish: return "🐟"
        case .rabbit: return "🐰"
        case .other: return "🐾"
        }
    }
}

struct FoodSummary: Codable, Identifiable, Equatable {
    let id: String
    let brand: String
    let productName: String
    let foodType: FoodType
    let targetPet: TargetPet
    let unitWeight: Double
    let calories: Double
    let protein: Double
    let fat: Double
    let moisture: Double
    let carbohydrate: Double
    let photoUrl: String?
    let groupId: String
    let creatorId: String?
    let createdAt: Date
    let updatedAt: Date
}

struct FoodDetails: Codable, Identifiable, Equatable {
    let id: String
    let brand: String
    let productName: String
    let foodType: FoodType
    let targetPet: TargetPet
    let unitWeight: Double
    let calories: Double
    let protein: Double
    let fat: Double
    let moisture: Double
    let carbohydrate: Double
    let caloriesPerUnit: Double
    let photoUrl: String?
    let groupId: String
    let groupName: String
    let creatorId: String?
    let creatorName: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

// ── Requests ──

struct CreateFoodRequest: Codable {
    var groupId: String
    var brand: String
    var productName: String
    var foodType: FoodType
    var targetPet: TargetPet
    var unitWeight: Double
    var calories: Double
    var protein: Double
    var fat: Double
    var moisture: Double
    var carbohydrate: Double
}

struct UpdateFoodRequest: Codable {
    let foodId: String
    var brand: String?
    var productName: String?
    var foodType: FoodType?
    var targetPet: TargetPet?
    var unitWeight: Double?
    var calories: Double?
    var protein: Double?
    var fat: Double?
    var moisture: Double?
    var carbohydrate: Double?
}

struct DeleteFoodRequest: Codable { let foodId: String }
