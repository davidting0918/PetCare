// RootView — routes between LoginView, a brief loading screen, and the
// main tab shell based on AuthStore's state. The file is named
// `ContentView.swift` because that's the slot the Xcode project references.

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var theme: ThemeManager

    var body: some View {
        ZStack {
            theme.tokens.bg.ignoresSafeArea()
            switch auth.state {
            case .loading:
                LaunchScreenView()
                    .transition(.opacity)
            case .unauthenticated:
                LoginView()
                    .transition(.opacity)
            case .authenticated:
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: auth.state)
    }
}
