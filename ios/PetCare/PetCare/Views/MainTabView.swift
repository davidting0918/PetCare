import SwiftUI

struct MainTabView: View {
    var authViewModel: AuthViewModel
    var petSelector: PetSelectorViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardPageView(petSelector: petSelector)
                .tabItem {
                    Image(systemName: "chart.bar.fill")
                    Text("Dashboard")
                }
                .tag(0)

            MealPageView(petSelector: petSelector)
                .tabItem {
                    Image(systemName: "fork.knife")
                    Text("Meals")
                }
                .tag(1)

            MedicinePageView(petSelector: petSelector)
                .tabItem {
                    Image(systemName: "pills.fill")
                    Text("Medicine")
                }
                .tag(2)

            WeightPageView(petSelector: petSelector)
                .tabItem {
                    Image(systemName: "scalemass.fill")
                    Text("Weight")
                }
                .tag(3)

            SettingsPageView(authViewModel: authViewModel, petSelector: petSelector)
                .tabItem {
                    Image(systemName: "gearshape.fill")
                    Text("Settings")
                }
                .tag(4)
        }
        .tint(Color.accentPink)
        .onAppear {
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(Color.surface1)
            appearance.stackedLayoutAppearance.normal.iconColor = UIColor(Color.textTertiary)
            appearance.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor(Color.textTertiary)]
            appearance.stackedLayoutAppearance.selected.iconColor = UIColor(Color.accentPink)
            appearance.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor(Color.accentPink)]
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
        }
    }
}
