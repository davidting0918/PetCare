import Foundation

// MARK: - Enums

enum PetType: String, Codable, CaseIterable {
    case dog, cat, bird, fish, rabbit, other
}

enum PetGender: String, Codable, CaseIterable {
    case male, female, unknown
}

// MARK: - Pet (from /pets/accessible list items)

struct PetInfo: Codable, Identifiable {
    let id: String
    let name: String
    let petType: PetType
    let breed: String?
    let gender: PetGender?
    let currentWeightKg: Double?
    let dailyCalorieTarget: Int?
    let targetWeightKg: Double?
    let ownerId: String
    let ownerName: String?
    let groupId: String?
    let groupName: String?
    let createdAt: String?
    let updatedAt: String?
    let photoUrl: String?
    let isActive: Bool?
    let userPermission: String?

    enum CodingKeys: String, CodingKey {
        case id, name, breed, gender
        case petType = "pet_type"
        case currentWeightKg = "current_weight_kg"
        case dailyCalorieTarget = "daily_calorie_target"
        case targetWeightKg = "target_weight_kg"
        case ownerId = "owner_id"
        case ownerName = "owner_name"
        case groupId = "group_id"
        case groupName = "group_name"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case photoUrl = "photo_url"
        case isActive = "is_active"
        case userPermission = "user_permission"
    }
}

// MARK: - Pet Details (from /pets/{id}/details)

struct PetDetails: Codable, Identifiable {
    let id: String
    let name: String
    let petType: PetType
    let breed: String?
    let gender: PetGender?
    let birthDate: String?
    let age: String?
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let heightCm: Double?
    let isSpayed: Bool?
    let microchipId: String?
    let dailyCalorieTarget: Int?
    let ownerId: String
    let ownerName: String?
    let groupId: String?
    let groupName: String?
    let photoUrl: String?
    let permissionLevel: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, name, breed, gender, age, notes
        case petType = "pet_type"
        case birthDate = "birth_date"
        case currentWeightKg = "current_weight_kg"
        case targetWeightKg = "target_weight_kg"
        case heightCm = "height_cm"
        case isSpayed = "is_spayed"
        case microchipId = "microchip_id"
        case dailyCalorieTarget = "daily_calorie_target"
        case ownerId = "owner_id"
        case ownerName = "owner_name"
        case groupId = "group_id"
        case groupName = "group_name"
        case photoUrl = "photo_url"
        case permissionLevel = "permission_level"
    }
}

// MARK: - Requests

struct CreatePetRequest: Codable {
    let name: String
    let petType: PetType
    let breed: String?
    let gender: PetGender?
    let birthDate: String?
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let dailyCalorieTarget: Int?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case name, breed, gender, notes
        case petType = "pet_type"
        case birthDate = "birth_date"
        case currentWeightKg = "current_weight_kg"
        case targetWeightKg = "target_weight_kg"
        case dailyCalorieTarget = "daily_calorie_target"
    }
}

struct UpdatePetRequest: Codable {
    var name: String?
    var breed: String?
    var gender: PetGender?
    var birthDate: String?
    var currentWeightKg: Double?
    var targetWeightKg: Double?
    var dailyCalorieTarget: Int?
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case name, breed, gender, notes
        case birthDate = "birth_date"
        case currentWeightKg = "current_weight_kg"
        case targetWeightKg = "target_weight_kg"
        case dailyCalorieTarget = "daily_calorie_target"
    }
}

struct AssignPetToGroupRequest: Codable {
    let groupId: String

    enum CodingKeys: String, CodingKey {
        case groupId = "group_id"
    }
}
