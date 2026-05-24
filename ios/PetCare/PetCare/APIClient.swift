// Networking layer + Keychain-backed token storage.
//
// Architecture (mirrors Heracles iOS):
//   - `APIClient` is a thin URLSession wrapper exposed as a singleton.
//   - The bearer token is sourced via a `tokenProvider` closure set by
//     `AuthStore` at init, so APIClient never has to retain the auth store.
//   - All request/response shapes live in *Models.swift files; APIClient just
//     handles JSON encoding/decoding + bearer-header injection.
//
// `TokenStorage` keeps the access + refresh tokens in the iOS Keychain (so
// they survive a force-quit and an app reinstall on the same device) and the
// cached `UserPublic` in UserDefaults (it's display-only and non-sensitive).

import Foundation
import Security

// MARK: - AppConfig

enum AppConfig {
    /// Base URL for the PetCare backend. Debug builds default to localhost
    /// (use 127.0.0.1 on a real device since simulator-style "localhost" won't
    /// resolve over USB). Release builds point at production.
    ///
    /// Override at runtime by setting `PETCARE_API_BASE_URL` in Info.plist.
    static var apiBaseURL: URL {
        if let override = Bundle.main.object(forInfoDictionaryKey: "PETCARE_API_BASE_URL") as? String,
           let url = URL(string: override) {
            return url
        }
        #if DEBUG
        #if targetEnvironment(simulator)
        return URL(string: "http://localhost:8000")!
        #else
        return URL(string: "http://127.0.0.1:8000")!
        #endif
        #else
        // TODO: point at the real production hostname once DNS is wired up.
        return URL(string: "https://petcare.dting.app")!
        #endif
    }

    /// Google OAuth iOS client ID — must match `GOOGLE_IOS_CLIENT_ID` in the
    /// backend's `.env`. Read from Info.plist's `GIDClientID`.
    static var googleIOSClientID: String? {
        Bundle.main.object(forInfoDictionaryKey: "GIDClientID") as? String
    }
}

// MARK: - APIError

enum APIError: Error, LocalizedError {
    case transport(Error)
    case decoding(Error)
    case server(status: Int, detail: String?)
    case unauthorized
    case noToken

    var errorDescription: String? {
        switch self {
        case .transport(let e):  return "Network error: \(e.localizedDescription)"
        case .decoding(let e):   return "Decode error: \(e.localizedDescription)"
        case .server(_, let d):  return d ?? "Server error"
        case .unauthorized:      return "Session expired — please sign in again."
        case .noToken:           return "Not signed in."
        }
    }
}

// MARK: - APIClient

final class APIClient {
    static let shared = APIClient()

    /// Set by `AuthStore` so we can inject `Authorization: Bearer <jwt>`.
    /// Closure rather than a stored property so the client doesn't retain
    /// AuthStore — avoids a retain cycle and keeps wiring testable.
    var tokenProvider: (() -> String?)?

    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    private init() {
        let cfg = URLSessionConfiguration.default
        cfg.timeoutIntervalForRequest = 20
        cfg.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: cfg)

        self.encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        encoder.dateEncodingStrategy = .iso8601

        let isoFractional = ISO8601DateFormatter()
        isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let isoPlain = ISO8601DateFormatter()
        isoPlain.formatOptions = [.withInternetDateTime]

        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { dec in
            let container = try dec.singleValueContainer()
            let raw = try container.decode(String.self)
            if let d = isoFractional.date(from: raw) { return d }
            if let d = isoPlain.date(from: raw) { return d }
            // Tolerate plain YYYY-MM-DD too (DATE columns come back this way).
            let dfDate = DateFormatter()
            dfDate.calendar = Calendar(identifier: .iso8601)
            dfDate.locale = Locale(identifier: "en_US_POSIX")
            dfDate.timeZone = TimeZone(secondsFromGMT: 0)
            dfDate.dateFormat = "yyyy-MM-dd"
            if let d = dfDate.date(from: raw) { return d }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Unrecognized date format: \(raw)"
            )
        }
    }

    // MARK: GET / POST helpers

    func get<Response: Decodable>(_ path: String,
                                  query: [String: String?] = [:],
                                  authenticated: Bool = true) async throws -> Response {
        var components = URLComponents(url: AppConfig.apiBaseURL.appendingPathComponent(path),
                                       resolvingAgainstBaseURL: false)!
        let items = query.compactMap { (k, v) -> URLQueryItem? in
            guard let v = v else { return nil }
            return URLQueryItem(name: k, value: v)
        }
        if !items.isEmpty { components.queryItems = items }
        var req = URLRequest(url: components.url!)
        req.httpMethod = "GET"
        return try await send(req, authenticated: authenticated)
    }

    func post<Body: Encodable, Response: Decodable>(_ path: String,
                                                    body: Body,
                                                    authenticated: Bool = true) async throws -> Response {
        var req = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try encoder.encode(body)
        return try await send(req, authenticated: authenticated)
    }

    /// Multipart upload — used by photo endpoints.
    func uploadPhoto<Response: Decodable>(
        _ path: String,
        formFields: [String: String] = [:],
        fileField: String = "file",
        fileName: String,
        mimeType: String,
        data: Data
    ) async throws -> Response {
        var req = URLRequest(url: AppConfig.apiBaseURL.appendingPathComponent(path))
        req.httpMethod = "POST"
        let boundary = "Boundary-\(UUID().uuidString)"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        for (name, value) in formFields {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(value)\r\n".data(using: .utf8)!)
        }
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body
        return try await send(req, authenticated: true)
    }

    // MARK: - Internal

    private func send<Response: Decodable>(_ request: URLRequest, authenticated: Bool) async throws -> Response {
        var req = request
        if authenticated {
            guard let token = tokenProvider?() else { throw APIError.noToken }
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.server(status: -1, detail: "No HTTP response")
        }
        if http.statusCode == 401 { throw APIError.unauthorized }
        if !(200..<300).contains(http.statusCode) {
            let detail = try? JSONDecoder().decode([String: String].self, from: data)["detail"]
            throw APIError.server(status: http.statusCode, detail: detail)
        }
        if Response.self == EmptyResponse.self, let empty = EmptyResponse() as? Response {
            return empty
        }
        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }
}

/// Placeholder for endpoints that return an opaque dict we don't care about.
struct EmptyResponse: Decodable {}

// MARK: - TokenStorage (Keychain + UserDefaults)

enum TokenStorage {
    private static let service = "ai.petcare.tokens"
    private static let accessKey = "access_token"
    private static let refreshKey = "refresh_token"
    private static let cachedUserKey = "petcare.cachedUser"

    // ── Tokens (Keychain) ──

    static var accessToken: String? {
        get { read(accessKey) }
        set { write(accessKey, value: newValue) }
    }

    static var refreshToken: String? {
        get { read(refreshKey) }
        set { write(refreshKey, value: newValue) }
    }

    static func clearTokens() {
        delete(accessKey)
        delete(refreshKey)
        UserDefaults.standard.removeObject(forKey: cachedUserKey)
    }

    // ── Cached user profile (UserDefaults — display-only) ──

    static var cachedUser: UserPublic? {
        get {
            guard let data = UserDefaults.standard.data(forKey: cachedUserKey) else { return nil }
            return try? JSONDecoder().decode(UserPublic.self, from: data)
        }
        set {
            if let user = newValue, let data = try? JSONEncoder().encode(user) {
                UserDefaults.standard.set(data, forKey: cachedUserKey)
            } else {
                UserDefaults.standard.removeObject(forKey: cachedUserKey)
            }
        }
    }

    // ── Keychain primitives ──

    private static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess, let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func write(_ key: String, value: String?) {
        if let value = value {
            let data = value.data(using: .utf8)!
            let query: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: key,
            ]
            let attributes: [String: Any] = [kSecValueData as String: data]
            let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
            if status == errSecItemNotFound {
                var insert = query
                insert[kSecValueData as String] = data
                SecItemAdd(insert as CFDictionary, nil)
            }
        } else {
            delete(key)
        }
    }

    private static func delete(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}
