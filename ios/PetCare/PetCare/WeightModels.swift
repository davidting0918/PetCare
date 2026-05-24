// Weight DTOs — mirror backend/models/weight.py.

import Foundation

enum WeightOrderBy: String, Codable {
    case timestamp, createdAt = "created_at", updatedAt = "updated_at"
}

enum OrderDirection: String, Codable { case asc, desc }

struct WeightSummary: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let weight: Double
    let userId: String
    let userName: String
    let timestamp: Date
    let notes: String?
    let createdAt: Date
    let updatedAt: Date
}

struct WeightDetails: Codable, Identifiable, Equatable {
    let id: String
    let petId: String
    let petName: String
    let petType: String
    let weight: Double
    let userId: String
    let userName: String
    let timestamp: Date
    let notes: String?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct WeightListResponse: Codable, Equatable {
    let records: [WeightSummary]
    let total: Int
    let page: Int
    let number: Int
    let totalPages: Int
}

// ── Requests ──

struct CreateWeightRequest: Codable {
    var petId: String
    var weight: Double
    var timestamp: Date?
    var notes: String?
}

struct UpdateWeightRequest: Codable {
    let weightId: String
    var weight: Double?
    var timestamp: Date?
    var notes: String?
}

struct DeleteWeightRequest: Codable { let weightId: String }
