// AuthStore — Apple + Google sign-in, refresh token rotation, cold-launch UX.
//
// Cold-launch rule (matches Heracles' "never spinner-flicker" principle):
//   • If we have BOTH a cached user AND tokens on disk → jump straight to
//     .authenticated with no loading state, then silently refresh /user/me.
//   • If we only have a refresh token → show .loading briefly while we
//     bootstrap a new access-token pair.
//   • Otherwise → .unauthenticated.

import AuthenticationServices
import Combine
import Foundation
import GoogleSignIn
import SwiftUI
import UIKit

@MainActor
final class AuthStore: NSObject, ObservableObject {

    enum State: Equatable {
        case loading
        case unauthenticated
        case authenticated(UserPublic)
    }

    @Published var state: State = .loading
    @Published var errorMessage: String?
    @Published var inFlight: Bool = false

    // Apple Sign-In delegate keeps a strong reference to the controller while
    // it's presented; we stash the continuation here.
    private var appleContinuation: CheckedContinuation<AppleLoginRequest, Error>?

    override init() {
        super.init()
        APIClient.shared.tokenProvider = { TokenStorage.accessToken }
        bootstrap()
    }

    private func bootstrap() {
        // Synchronously hydrate from Keychain + UserDefaults so we don't
        // flash a loading screen if everything's cached.
        let token = TokenStorage.accessToken
        let cached = TokenStorage.cachedUser

        if token != nil, let cached = cached {
            self.state = .authenticated(cached)
            Task { await silentlyRefreshProfile() }
            return
        }

        if TokenStorage.refreshToken != nil {
            self.state = .loading
            Task { await tryRefreshFlow() }
            return
        }

        self.state = .unauthenticated
    }

    private func silentlyRefreshProfile() async {
        do {
            let me: UserPublic = try await APIClient.shared.get("/user/me")
            TokenStorage.cachedUser = me
            self.state = .authenticated(me)
        } catch APIError.unauthorized {
            await tryRefreshFlow()
        } catch {
            // Stay on whatever we had cached.
        }
    }

    private func tryRefreshFlow() async {
        guard let refresh = TokenStorage.refreshToken else {
            await signOutLocal()
            return
        }
        do {
            let pair: TokenPair = try await APIClient.shared.post(
                "/auth/token/refresh",
                body: RefreshRequest(refreshToken: refresh),
                authenticated: false
            )
            TokenStorage.accessToken = pair.accessToken
            TokenStorage.refreshToken = pair.refreshToken
            let me: UserPublic = try await APIClient.shared.get("/user/me")
            TokenStorage.cachedUser = me
            self.state = .authenticated(me)
        } catch {
            await signOutLocal()
        }
    }

    // MARK: Sign-in / sign-out

    func signInWithGoogle(presenting: UIViewController) async {
        guard let clientID = AppConfig.googleIOSClientID else {
            self.errorMessage = "Google sign-in is not configured (missing GIDClientID)."
            return
        }
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientID)
        self.inFlight = true
        defer { self.inFlight = false }
        do {
            let signed = try await GIDSignIn.sharedInstance.signIn(withPresenting: presenting)
            guard let idToken = signed.user.idToken?.tokenString else {
                self.errorMessage = "Google did not return an ID token."
                return
            }
            let resp: LoginResponse = try await APIClient.shared.post(
                "/auth/google/login",
                body: GoogleLoginRequest(token: idToken),
                authenticated: false
            )
            persist(resp)
        } catch let err as APIError {
            self.errorMessage = err.errorDescription
        } catch {
            self.errorMessage = "Google sign-in failed: \(error.localizedDescription)"
        }
    }

    func signInWithApple() async {
        self.inFlight = true
        defer { self.inFlight = false }
        do {
            let req = try await performAppleAuth()
            let resp: LoginResponse = try await APIClient.shared.post(
                "/auth/apple/login",
                body: req,
                authenticated: false
            )
            persist(resp)
        } catch let err as APIError {
            self.errorMessage = err.errorDescription
        } catch ASAuthorizationError.canceled {
            // user dismissed — no toast.
        } catch {
            self.errorMessage = "Apple sign-in failed: \(error.localizedDescription)"
        }
    }

    func signOut() async {
        // Tell the backend to revoke our row, then nuke local credentials.
        // Failure to reach the server is fine — local sign-out still wins.
        _ = try? await APIClient.shared.post(
            "/auth/logout",
            body: EmptyBody(),
            authenticated: true
        ) as EmptyResponse
        await signOutLocal()
    }

    private func signOutLocal() async {
        TokenStorage.clearTokens()
        self.state = .unauthenticated
    }

    private func persist(_ resp: LoginResponse) {
        TokenStorage.accessToken = resp.accessToken
        TokenStorage.refreshToken = resp.refreshToken
        TokenStorage.cachedUser = resp.user
        self.state = .authenticated(resp.user)
    }

    func updateLocal(user: UserPublic) {
        TokenStorage.cachedUser = user
        self.state = .authenticated(user)
    }

    // MARK: Apple Sign-In glue (uses AuthenticationServices)

    private func performAppleAuth() async throws -> AppleLoginRequest {
        try await withCheckedThrowingContinuation { cont in
            self.appleContinuation = cont
            let req = ASAuthorizationAppleIDProvider().createRequest()
            req.requestedScopes = [.fullName, .email]
            let controller = ASAuthorizationController(authorizationRequests: [req])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }
}

private struct EmptyBody: Encodable {}

// MARK: - Apple Sign-In delegate plumbing

extension AuthStore: ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    nonisolated func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        // Walk the connected scenes for the active key window. Falling back
        // to a fresh ASPresentationAnchor() if anything's odd — at worst the
        // sheet appears on the foreground window.
        let scene = UIApplication.shared
            .connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first(where: { $0.activationState == .foregroundActive })
        return scene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }

    nonisolated func authorizationController(controller: ASAuthorizationController,
                                              didCompleteWithAuthorization authorization: ASAuthorization) {
        Task { @MainActor in
            guard let cred = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                self.appleContinuation?.resume(throwing: APIError.server(status: 0, detail: "Apple did not return a token"))
                self.appleContinuation = nil
                return
            }
            let name: AppleFullName?
            if let pn = cred.fullName, (pn.givenName != nil || pn.familyName != nil) {
                name = AppleFullName(givenName: pn.givenName, familyName: pn.familyName)
            } else {
                name = nil
            }
            let email = cred.email
            let req = AppleLoginRequest(identityToken: token, email: email, fullName: name)
            self.appleContinuation?.resume(returning: req)
            self.appleContinuation = nil
        }
    }

    nonisolated func authorizationController(controller: ASAuthorizationController,
                                              didCompleteWithError error: Error) {
        Task { @MainActor in
            self.appleContinuation?.resume(throwing: error)
            self.appleContinuation = nil
        }
    }
}
