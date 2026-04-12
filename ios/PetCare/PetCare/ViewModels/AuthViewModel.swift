import Foundation
import GoogleSignIn

@Observable
final class AuthViewModel {
    var user: User?
    var accessToken: String?
    var isLoading = false
    var errorMessage: String?
    private var unauthorizedObserver: Any?

    var isLoggedIn: Bool { accessToken != nil }

    /// Default init (no token)
    init() {
        setupUnauthorizedObserver()
    }

    /// Init with a restored token from Keychain — assume logged in immediately
    init(restoredToken: String?) {
        self.accessToken = restoredToken
        setupUnauthorizedObserver()
    }

    private func setupUnauthorizedObserver() {
        unauthorizedObserver = NotificationCenter.default.addObserver(
            forName: APIClient.unauthorizedNotification, object: nil, queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            Task { @MainActor in self.logout() }
        }
    }

    deinit {
        if let observer = unauthorizedObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    /// Validate the token in background — if invalid, 401 handler will auto-logout
    @MainActor
    func validateSession() async {
        guard accessToken != nil else { return }
        do {
            let userInfo = try await APIClient.shared.fetchCurrentUser()
            self.user = User(id: userInfo.id, email: userInfo.email, name: userInfo.name, picture: userInfo.picture)
        } catch {
            // 401 triggers the unauthorized observer → auto logout
            // Other errors: might be a network blip, don't logout
        }
    }

    @MainActor
    func signInWithGoogle() async {
        isLoading = true
        errorMessage = nil
        do {
            guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootVC = windowScene.windows.first?.rootViewController else {
                errorMessage = "Cannot find root view controller"
                isLoading = false
                return
            }
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "No ID token received from Google"
                isLoading = false
                return
            }
            let loginData = try await APIClient.shared.googleLogin(idToken: idToken)
            // Tokens are saved to Keychain inside APIClient.googleLogin()
            self.accessToken = loginData.accessToken
            self.user = loginData.user
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func logout() {
        GIDSignIn.sharedInstance.signOut()
        accessToken = nil
        user = nil
        KeychainHelper.deleteAll()
        // Also clean up legacy UserDefaults token if it exists
        UserDefaults.standard.removeObject(forKey: "petcare_token")
    }
}
