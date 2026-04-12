import SwiftUI

struct ContentView: View {
    @State private var authViewModel: AuthViewModel
    @State private var dataStore = DataStore()
    @State private var showLaunch = true

    init() {
        let savedToken = KeychainHelper.read(forKey: KeychainHelper.accessTokenKey)
        _authViewModel = State(initialValue: AuthViewModel(restoredToken: savedToken))
    }

    var body: some View {
        ZStack {
            SwiftUI.Group {
                if authViewModel.isLoggedIn {
                    MainTabView(authViewModel: authViewModel, dataStore: dataStore)
                } else {
                    LoginView(authViewModel: authViewModel)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: authViewModel.isLoggedIn)

            if showLaunch {
                LaunchScreenView()
                    .transition(.opacity)
                    .zIndex(1)
            }
        }
        .task {
            if authViewModel.isLoggedIn {
                // Load cached data instantly (synchronous)
                dataStore.loadFromCache()
            }

            // Show launch animation for at least 1.2s
            try? await Task.sleep(for: .seconds(1.2))
            withAnimation(.easeOut(duration: 0.4)) {
                showLaunch = false
            }

            if authViewModel.isLoggedIn {
                // Background: validate session + refresh all data from API
                async let userTask: () = authViewModel.validateSession()
                async let preloadTask: () = dataStore.preloadAll()
                _ = await (userTask, preloadTask)
            }
        }
        .onChange(of: authViewModel.isLoggedIn) { _, isLoggedIn in
            if isLoggedIn {
                Task {
                    dataStore.loadFromCache()
                    await dataStore.preloadAll()
                }
            } else {
                dataStore.clearAll()
            }
        }
    }
}
