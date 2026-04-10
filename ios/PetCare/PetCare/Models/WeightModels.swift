import Foundation

struct WeightRecord: Codable, Identifiable {
    let id: String
    let petId: String?
    let weightKg: Double
    let timestamp: String?
    let recordedBy: String?
    let recordedByName: String?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, timestamp, notes
        case petId = "pet_id"
        case weightKg = "weight_kg"
        case recordedBy = "recorded_by"
        case recordedByName = "recorded_by_name"
        case createdAt = "created_at"
    }
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
    let weightKg: Double
    let timestamp: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case notes, timestamp
        case petId = "pet_id"
        case weightKg = "weight_kg"
    }
}

struct UpdateWeightRequest: Codable {
    var weightKg: Double?
    var timestamp: String?
    var notes: String?

    enum CodingKeys: String, CodingKey {
        case notes, timestamp
        case weightKg = "weight_kg"
    }
}
