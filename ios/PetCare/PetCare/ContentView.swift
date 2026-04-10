import SwiftUI

struct ContentView: View {
    @State private var authViewModel = AuthViewModel()
    @State private var petSelector = PetSelectorViewModel()
    @State private var isRestoringSession = true

    var body: some View {
        Group {
            if isRestoringSession {
                ZStack {
                    Color.surface0.ignoresSafeArea()
                    VStack(spacing: 16) {
                        Image(systemName: "pawprint.fill")
                            .font(.system(size: 48))
                            .foregroundStyle(Color.accentTeal)
                        ProgressView()
                            .tint(Color.accentTeal)
                    }
                }
            } else if authViewModel.isLoggedIn {
                MainTabView(authViewModel: authViewModel, petSelector: petSelector)
            } else {
                LoginView(authViewModel: authViewModel)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)
        .animation(.easeInOut(duration: 0.3), value: isRestoringSession)
        .task {
            await authViewModel.restoreSession()
            if authViewModel.isLoggedIn {
                await petSelector.loadPets()
            }
            isRestoringSession = false
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
