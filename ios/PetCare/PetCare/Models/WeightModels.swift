import Foundation

struct WeightRecord: Codable, Identifiable {
    let id: String
    let petId: String?
    let weight: Double
    let userId: String?
    let userName: String?
    let timestamp: String?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, weight, timestamp, notes
        case petId = "pet_id"
        case userId = "user_id"
        case userName = "user_name"
        case createdAt = "created_at"
    }

    // Convenience alias for views
    var weightKg: Double { weight }
    var recordedByName: String? { userName }
}

struct WeightListResponse: Codable {
    let records: [WeightRecord]
    let total: Int
    let page: Int
    let number: Int
    let totalPages: Int?

    enum CodingKeys: String, CodingKey {
        case records, total, page, number
        case totalPages = "total_pages"
    }
}

struct CreateWeightRequest: Codable {
    let petId: String
    let weight: Double
    let timestamp: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case weight, notes, timestamp
        case petId = "pet_id"
    }
}

struct UpdateWeightRequest: Codable {
    var weight: Double?
    var timestamp: String?
    var notes: String?
}
