import Foundation
import GoogleSignIn

@Observable
final class AuthViewModel {
    var user: User?
    var accessToken: String?
    var isLoading = false
    var errorMessage: String?
    private var unauthorizedObserver: Any?

    var isLoggedIn: Bool { accessToken != nil && user != nil }

    init() {
        // Listen for 401 notifications from APIClient
        unauthorizedObserver = NotificationCenter.default.addObserver(
            forName: APIClient.unauthorizedNotification, object: nil, queue: .main
        ) { [weak self] _ in
            self?.logout()
        }
    }

    deinit {
        if let observer = unauthorizedObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    /// Try to restore session from persisted token on app launch
    @MainActor
    func restoreSession() async {
        guard let savedToken = UserDefaults.standard.string(forKey: "petcare_token") else { return }
        self.accessToken = savedToken
        do {
            let userInfo = try await APIClient.shared.fetchCurrentUser()
            self.user = User(id: userInfo.id, email: userInfo.email, name: userInfo.name, picture: userInfo.picture)
        } catch {
            // Token is invalid — clear it
            self.accessToken = nil
            UserDefaults.standard.removeObject(forKey: "petcare_token")
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
            self.accessToken = loginData.accessToken
            self.user = loginData.user
            UserDefaults.standard.set(loginData.accessToken, forKey: "petcare_token")
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
        UserDefaults.standard.removeObject(forKey: "petcare_token")
    }
}
