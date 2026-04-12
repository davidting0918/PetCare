import SwiftUI

struct ContentView: View {
    @State private var authViewModel: AuthViewModel
    @State private var petSelector = PetSelectorViewModel()
    @State private var showLaunch = true

    init() {
        // Read token from Keychain — if present, assume logged in immediately.
        let savedToken = KeychainHelper.read(forKey: KeychainHelper.accessTokenKey)
        _authViewModel = State(initialValue: AuthViewModel(restoredToken: savedToken))
    }

    var body: some View {
        ZStack {
            // Main content underneath
            SwiftUI.Group {
                if authViewModel.isLoggedIn {
                    MainTabView(authViewModel: authViewModel, petSelector: petSelector)
                } else {
                    LoginView(authViewModel: authViewModel)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)

            // Launch screen on top — disappears after animation
            if showLaunch {
                LaunchScreenView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .task {
            // Show launch animation for at least 1.5s so it feels intentional
            try? await Task.sleep(for: .seconds(1.5))
            withAnimation(.easeOut(duration: 0.4)) {
                showLaunch = false
            }

            if authViewModel.isLoggedIn {
                async let petsTask: () = petSelector.loadPets()
                async let userTask: () = authViewModel.validateSession()
                _ = await (petsTask, userTask)
            }
        }
        .onChange(of: authViewModel.isLoggedIn) { _, isLoggedIn in
            if isLoggedIn {
                Task { await petSelector.loadPets() }
            } else {
                petSelector.pets = []
                petSelector.selectedPet = nil
                petSelector.selectedPetDetails = nil
            }
        }
    }
}
