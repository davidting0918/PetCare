import Foundation

// MARK: - Request

struct GoogleLoginRequest: Codable {
    let token: String
}

struct RefreshTokenRequest: Codable {
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case refreshToken = "refresh_token"
    }
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
    let refreshToken: String
    let user: User

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case refreshToken = "refresh_token"
        case user
    }
}

// MARK: - Refresh response data

struct RefreshResponseData: Codable {
    let accessToken: String
    let tokenType: String
    let refreshToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
        case tokenType = "token_type"
        case refreshToken = "refresh_token"
    }
}

// MARK: - User (auth context — lightweight)

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let picture: String?
}
