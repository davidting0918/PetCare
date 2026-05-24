// Pet DTOs — mirror backend/models/pet.py.

import Foundation

enum PetType: String, Codable, CaseIterable, Identifiable {
    case dog, cat, bird, fish, rabbit, other
    var id: String { rawValue }
    var emoji: String {
        switch self {
        case .dog:    return "🐶"
        case .cat:    return "🐱"
        case .bird:   return "🐦"
        case .fish:   return "🐟"
        case .rabbit: return "🐰"
        case .other:  return "🐾"
        }
    }
    var displayName: String {
        switch self {
        case .dog:    return "Dog"
        case .cat:    return "Cat"
        case .bird:   return "Bird"
        case .fish:   return "Fish"
        case .rabbit: return "Rabbit"
        case .other:  return "Other"
        }
    }
}

enum PetGender: String, Codable, CaseIterable, Identifiable {
    case male, female, unknown
    var id: String { rawValue }
    var displayName: String {
        switch self {
        case .male:    return "Male"
        case .female:  return "Female"
        case .unknown: return "Unknown"
        }
    }
}

struct PetDetails: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let petType: PetType
    let breed: String?
    let gender: PetGender
    let birthDate: Date?
    let age: Double?
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let heightCm: Double?
    let isSpayed: Bool
    let microchipId: String?
    let dailyCalorieTarget: Int?
    let ownerId: String
    let ownerName: String
    let groupId: String
    let groupName: String
    let photoUrl: String?
    let notes: String?
    let userPermission: String
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct PetSummary: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let petType: PetType
    let breed: String?
    let gender: PetGender
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let dailyCalorieTarget: Int?
    let photoUrl: String?
    let ownerId: String
    let ownerName: String
    let groupId: String
    let groupName: String
    let userPermission: String
    let createdAt: Date
    let updatedAt: Date
}

struct GroupAssignmentInfo: Codable, Equatable {
    let petId: String
    let petName: String
    let groupId: String
    let groupName: String
    let userRoleInGroup: String
}

// ── Requests ──

struct CreatePetRequest: Codable {
    var name: String
    var petType: PetType
    var gender: PetGender = .unknown
    var breed: String?
    var birthDate: Date?
    var currentWeightKg: Double?
    var targetWeightKg: Double?
    var heightCm: Double?
    var isSpayed: Bool = false
    var microchipId: String?
    var dailyCalorieTarget: Int?
    var notes: String?
    var groupId: String?
}

struct UpdatePetRequest: Codable {
    let petId: String
    var name: String?
    var breed: String?
    var gender: PetGender?
    var birthDate: Date?
    var currentWeightKg: Double?
    var targetWeightKg: Double?
    var heightCm: Double?
    var isSpayed: Bool?
    var microchipId: String?
    var dailyCalorieTarget: Int?
    var notes: String?
}

struct DeletePetRequest: Codable { let petId: String }
struct AssignPetToGroupRequest: Codable { let petId: String; let groupId: String }
