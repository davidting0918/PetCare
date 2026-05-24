// MainTabView — 5-tab shell matching the prototype's bottom bar.
// Tabs: Dashboard, Pet, Meal, Medicine, Settings.

import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var groups: GroupsStore
    @EnvironmentObject var auth: AuthStore
    @Environment(\.theme) private var theme

    @State private var selected: AppTab = .dashboard

    var body: some View {
        ZStack(alignment: .bottom) {
            tabContent
                .ignoresSafeArea(edges: .bottom)

            TabBar(selected: $selected)
        }
        .background(theme.bg)
        .task {
            // Prime the cached-first stores on first display.
            async let pa = pets.refresh()
            async let ga = groups.refresh()
            _ = await (pa, ga)
        }
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selected {
        case .dashboard: DashboardPageView()
        case .pet:       PetPageRoot()
        case .meal:      MealPageRoot()
        case .medicine:  MedicinePageView()
        case .settings:  SettingsPageView()
        }
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard, pet, meal, medicine, settings
    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard: return "Dashboard"
        case .pet:       return "Pet"
        case .meal:      return "Meal"
        case .medicine:  return "Medicine"
        case .settings:  return "Settings"
        }
    }

    var sfSymbol: String {
        switch self {
        case .dashboard: return "square.grid.2x2.fill"
        case .pet:       return "pawprint.fill"
        case .meal:      return "fork.knife"
        case .medicine:  return "pills.fill"
        case .settings:  return "gearshape.fill"
        }
    }
}

struct TabBar: View {
    @Binding var selected: AppTab
    @Environment(\.theme) private var theme

    var body: some View {
        VStack(spacing: 0) {
            Rectangle().fill(theme.border).frame(height: 1)
            HStack(spacing: 0) {
                ForEach(AppTab.allCases) { tab in
                    Button { selected = tab } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tab.sfSymbol)
                                .font(.system(size: 20, weight: .semibold))
                            Text(tab.title)
                                .font(.system(size: 10, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(selected == tab ? theme.primary : theme.textMuted)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 28)
            .background(theme.surface.opacity(0.92))
        }
    }
}
