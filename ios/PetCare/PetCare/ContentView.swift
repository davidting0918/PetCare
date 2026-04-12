import SwiftUI

struct ContentView: View {
    @State private var authViewModel: AuthViewModel
    @State private var petSelector = PetSelectorViewModel()

    init() {
        // Read token from Keychain — if present, assume logged in immediately.
        // Background validation will kick us out via 401 if the token is expired.
        let savedToken = KeychainHelper.read(forKey: KeychainHelper.accessTokenKey)
        _authViewModel = State(initialValue: AuthViewModel(restoredToken: savedToken))
    }

    var body: some View {
        SwiftUI.Group {
            if authViewModel.isLoggedIn {
                MainTabView(authViewModel: authViewModel, petSelector: petSelector)
            } else {
                LoginView(authViewModel: authViewModel)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)
        .task {
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
