// Meal tab — combines a sub-tab toggle between the food catalog (FoodView)
// and the timeline-style meal log (screen 09).
//
// File slot is `MealPageView.swift` from the previous PetCare build.

import SwiftUI

struct MealPageRoot: View {
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var auth: AuthStore
    @Environment(\.theme) private var theme
    @State private var subtab: SubTab = .log

    enum SubTab: String, CaseIterable, Identifiable {
        case log, foods
        var id: String { rawValue }
        var title: String {
            switch self {
            case .log: return "Today"
            case .foods: return "Catalog"
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Custom sub-tab pill, sticky at the top.
            HStack {
                Spacer()
                SegPicker(
                    selection: $subtab,
                    options: SubTab.allCases.map { ($0, $0.title) }
                )
                .frame(width: 200)
                Spacer()
            }
            .padding(.top, 14)
            .padding(.bottom, 6)
            .background(theme.bg)

            Group {
                switch subtab {
                case .log:   MealLogView()
                case .foods: foodTabContent
                }
            }
        }
        .background(theme.bg)
    }

    private var foodTabContent: some View {
        Group {
            if let gid = groupId {
                FoodView(groupId: gid)
            } else {
                emptyFood
            }
        }
    }

    private var groupId: String? {
        // Prefer the selected pet's group, fall back to the user's
        // personal_group_id so the catalog is always anchored to something.
        if let pet = pets.selectedPet { return pet.groupId }
        if case .authenticated(let u) = auth.state { return u.personalGroupId }
        return nil
    }

    private var emptyFood: some View {
        VStack {
            Spacer()
            Text("No group available yet. Add a pet first.")
                .font(.system(size: 13))
                .foregroundStyle(theme.textMuted)
                .padding()
            Spacer()
        }
    }
}

// MARK: - 09 Meal Log (timeline view)

struct MealLogView: View {
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var meals: MealsStore
    @EnvironmentObject var foods: FoodsStore
    @Environment(\.theme) private var theme
    @State private var addOpen = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(
                        kicker: "Today · \(pets.selectedPet?.name ?? "—")",
                        title: "Meals"
                    ) {
                        IconButton(icon: "calendar") {}
                    }

                    if let pet = pets.selectedPet {
                        intakeCard(petId: pet.id)
                            .padding(.horizontal, 20)
                        SectionLabel(text: "Timeline")
                            .padding(.horizontal, 20)
                            .padding(.top, 16).padding(.bottom, 6)
                        timeline
                            .padding(.horizontal, 20)
                    } else {
                        Text("Select a pet from the Dashboard or Pet tab.")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.textMuted)
                            .padding(20)
                    }
                    Spacer(minLength: 120)
                }
            }
            if pets.selectedPet != nil {
                FloatingActionButton(icon: "plus") { addOpen = true }
                    .padding(.trailing, 18).padding(.bottom, 24)
            }
        }
        .task(id: pets.selectedPetId) {
            guard let pet = pets.selectedPet else { return }
            await meals.loadToday(petId: pet.id)
        }
        .sheet(isPresented: $addOpen) {
            if let pet = pets.selectedPet {
                AddMealSheet(petId: pet.id, groupId: pet.groupId) { addOpen = false }
            }
        }
    }

    private func intakeCard(petId: String) -> some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        SectionLabel(text: "Today's intake")
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text("\(Int(meals.today?.totalCalories ?? 0))")
                                .font(.system(size: 24, weight: .bold))
                                .foregroundStyle(theme.textPrimary)
                            Text("/ \(meals.today?.dailyCalorieTarget ?? 0) kcal")
                                .font(.system(size: 13))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                    Spacer()
                    Pill(label: "\(Int(meals.today?.calorieTargetPercentage ?? 0))%")
                }
                ProgressBar(percent: min(1, (meals.today?.calorieTargetPercentage ?? 0) / 100.0))
                HStack {
                    Text("\(meals.today?.totalMeals ?? 0) logged")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textSecondary)
                    Spacer()
                    if let target = meals.today?.dailyCalorieTarget,
                       let total = meals.today?.totalCalories {
                        let left = max(0, Double(target) - total)
                        Text("\(Int(left)) kcal remaining")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.textSecondary)
                    }
                }
            }
        }
    }

    private var timeline: some View {
        VStack(spacing: 12) {
            ForEach(meals.today?.meals ?? []) { m in
                HStack(alignment: .top, spacing: 12) {
                    Circle()
                        .fill(theme.primary)
                        .frame(width: 10, height: 10)
                        .padding(.top, 14)
                    CardSurface(padding: 12) {
                        HStack(spacing: 12) {
                            Text("🥣")
                                .font(.system(size: 16))
                                .frame(width: 40, height: 40)
                                .background(theme.primarySoft)
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 4) {
                                    Text(m.mealType?.displayName.uppercased() ?? "MEAL")
                                        .font(.system(size: 10, weight: .semibold))
                                        .tracking(0.6)
                                        .foregroundStyle(theme.textMuted)
                                    Text("·")
                                    Text(AppFormat.time(m.timestamp))
                                        .font(.system(size: 11))
                                }
                                .foregroundStyle(theme.textMuted)
                                Text("\(m.foodBrand) \(m.foodProductName)")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(theme.textPrimary)
                                Text("\(m.servingType.displayName) · \(formatNumber(m.servingAmount)) · by \(m.fedByName)")
                                    .font(.system(size: 11))
                                    .foregroundStyle(theme.textSecondary)
                            }
                            Spacer()
                            Text("\(Int(m.calories)) kcal")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundStyle(theme.textPrimary)
                        }
                    }
                }
            }
            if (meals.today?.meals ?? []).isEmpty {
                Text("No meals yet today. Tap + to log one.")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textMuted)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
            }
        }
    }

    private func formatNumber(_ v: Double) -> String {
        if v >= 100 { return "\(Int(v))" }
        return String(format: "%.1f", v)
    }
}

struct ProgressBar: View {
    let percent: Double  // 0..1
    @Environment(\.theme) private var theme

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(theme.border)
                Capsule().fill(theme.primary)
                    .frame(width: g.size.width * max(0, min(1, percent)))
            }
        }
        .frame(height: 6)
        .clipShape(Capsule())
    }
}

// MARK: - Add meal sheet

struct AddMealSheet: View {
    let petId: String
    let groupId: String
    var onDone: () -> Void
    @EnvironmentObject var meals: MealsStore
    @EnvironmentObject var foods: FoodsStore
    @Environment(\.theme) private var theme

    @State private var selectedFood: FoodSummary?
    @State private var servingType: ServingType = .grams
    @State private var servingAmount: Double = 80
    @State private var mealType: MealType = .breakfast
    @State private var timestamp: Date = .init()
    @State private var notes: String = ""
    @State private var saving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    SectionLabel(text: "Food")
                    Menu {
                        ForEach(foods.foods) { f in
                            Button("\(f.brand) — \(f.productName)") {
                                selectedFood = f
                            }
                        }
                    } label: {
                        HStack {
                            Text(selectedFood.map { "\($0.brand) \($0.productName)" } ?? "Choose a food")
                                .foregroundStyle(theme.textPrimary)
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down").foregroundStyle(theme.textMuted)
                        }
                        .padding(12)
                        .background(theme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(theme.borderStrong, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }

                    SectionLabel(text: "Serving")
                    Picker("", selection: $servingType) {
                        ForEach(ServingType.allCases) { st in Text(st.displayName).tag(st) }
                    }
                    .pickerStyle(.segmented)

                    HStack {
                        Text(String(format: "%.0f", servingAmount))
                            .font(.system(size: 28, weight: .bold))
                            .foregroundStyle(theme.textPrimary)
                        Text(servingType.displayName)
                            .font(.system(size: 14))
                            .foregroundStyle(theme.textMuted)
                    }
                    Slider(value: $servingAmount, in: 1...500, step: 1).tint(theme.primary)

                    SectionLabel(text: "Meal type")
                    Picker("", selection: $mealType) {
                        ForEach(MealType.allCases) { mt in Text(mt.displayName).tag(mt) }
                    }
                    .pickerStyle(.segmented)

                    SectionLabel(text: "When")
                    DatePicker("", selection: $timestamp, displayedComponents: [.date, .hourAndMinute])
                        .labelsHidden()

                    SectionLabel(text: "Notes")
                    TextField("Optional", text: $notes)
                        .padding(12)
                        .background(theme.surface)
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .stroke(theme.borderStrong, lineWidth: 1)
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .padding(20)
            }
            .background(theme.bg)
            .navigationTitle("Log meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onDone() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() }
                        else { Text("Save").fontWeight(.semibold) }
                    }
                    .disabled(selectedFood == nil || saving)
                }
            }
            .task { await foods.load(groupId: groupId) }
        }
    }

    private func save() async {
        guard let f = selectedFood else { return }
        saving = true; defer { saving = false }
        let req = CreateMealRequest(
            petId: petId, foodId: f.id,
            servingType: servingType, servingAmount: servingAmount,
            timestamp: timestamp, mealType: mealType,
            notes: notes.isEmpty ? nil : notes
        )
        if await meals.create(req) != nil { onDone() }
    }
}
