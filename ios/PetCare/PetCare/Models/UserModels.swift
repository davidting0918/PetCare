import Foundation

struct UserInfo: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let picture: String?
    let personalGroupId: String?
    let createdAt: String?
    let updatedAt: String?
    let source: String?
    let isActive: Bool?

    enum CodingKeys: String, CodingKey {
        case id, email, name, picture, source
        case personalGroupId = "personal_group_id"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case isActive = "is_active"
    }
}

struct UpdateUserRequest: Codable {
    var name: String?
    var email: String?
}
