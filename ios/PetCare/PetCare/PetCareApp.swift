// PetCare iOS app entry. All stores are owned at the @main scope (matching
// Heracles' pattern) so they outlive view transitions and never lose state
// when tabs switch. Stores are injected into the view tree via
// `.environmentObject(...)`.

import GoogleSignIn
import SwiftUI

@main
struct PetCareApp: App {
    @StateObject private var auth = AuthStore()
    @StateObject private var theme = ThemeManager.shared
    @StateObject private var pets = PetsStore()
    @StateObject private var groups = GroupsStore()
    @StateObject private var foods = FoodsStore()
    @StateObject private var meals = MealsStore()
    @StateObject private var weights = WeightsStore()
    @StateObject private var medicine = MedicineStore()

    init() {
        // Warm up Google Sign-In so the first sign-in tap is fast.
        GIDSignIn.sharedInstance.restorePreviousSignIn { _, _ in }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(auth)
                .environmentObject(theme)
                .environmentObject(pets)
                .environmentObject(groups)
                .environmentObject(foods)
                .environmentObject(meals)
                .environmentObject(weights)
                .environmentObject(medicine)
                .environment(\.theme, theme.tokens)
                .preferredColorScheme(theme.theme.isDark ? .dark : .light)
                .onOpenURL { url in
                    GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
