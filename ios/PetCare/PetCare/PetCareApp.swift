import SwiftUI
import GoogleSignIn

@main
struct PetCareApp: App {
    init() {
        // Warm up Google Sign-In SDK early so the first sign-in tap is fast
        GIDSignIn.sharedInstance.restorePreviousSignIn { _, _ in }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
