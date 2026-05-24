// User + provider DTOs — Codable mirrors of backend/models/user.py.

import Foundation

enum AuthSource: String, Codable {
    case google, apple
}

struct UserPublic: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let name: String
    let picture: String?
    let source: AuthSource
    let personalGroupId: String?
}

struct UpdateProfileRequest: Codable {
    var name: String?
    var picture: String?
}
