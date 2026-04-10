import Foundation

// MARK: - Request

struct GoogleLoginRequest: Codable {
    let token: String
}

// MARK: - Response envelope

struct APIResponse<T: Codable>: Codable {
    let status: Int
    let data: T?
    let message: String?
}

// MARK: - Login response data

struct LoginResponseData: Codable {
    let accessToken: String
    let tokenType: String
    let user: User

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case user
    }
}

// MARK: - User (auth context — lightweight)

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let picture: String?
}
