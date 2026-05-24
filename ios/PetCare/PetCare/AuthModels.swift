// Auth DTOs — mirror backend/models/auth.py.

import Foundation

struct GoogleLoginRequest: Codable {
    let token: String
}

struct AppleFullName: Codable {
    let givenName: String?
    let familyName: String?
}

struct AppleLoginRequest: Codable {
    let identityToken: String
    let email: String?
    let fullName: AppleFullName?
}

struct RefreshRequest: Codable {
    let refreshToken: String
}

struct TokenPair: Codable {
    let accessToken: String
    let tokenType: String
    let refreshToken: String
}

struct LoginResponse: Codable {
    let accessToken: String
    let tokenType: String
    let refreshToken: String
    let user: UserPublic
}
