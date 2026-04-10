import SwiftUI
import Charts

struct MealPageView: View {
    var petSelector: PetSelectorViewModel
    @State private var mealVM = MealViewModel()
    @State private var foodVM = FoodViewModel()
    @State private var showCreateMeal = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Meals", petSelector: petSelector) {
                            if let pet = petSelector.selectedPet {
                                await mealVM.refresh(petId: pet.id)
                            }
                        }

                        if let pet = petSelector.selectedPet {
                            // Today's summary
                            if let summary = mealVM.todaySummary {
                                TodaySummaryCard(summary: summary, calorieTarget: pet.dailyCalorieTarget)
                            }

                            // Calorie chart
                            if !mealVM.meals.isEmpty {
                                CalorieChartCard(meals: mealVM.meals)
                            }

                            // Meals list
                            MealListSection(meals: mealVM.meals)
                        } else {
                            Text("Select a pet to view meals")
                                .foregroundStyle(Color.textTertiary)
                                .padding(.top, 40)
                        }
                    }
                }

                // FAB
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button { showCreateMeal = true } label: {
                            Image(systemName: "plus")
                                .font(.title2).fontWeight(.bold)
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.accentPink)
                                .clipShape(Circle())
                                .shadow(color: Color.accentPink.opacity(0.4), radius: 8, y: 4)
                        }
                        .padding(.trailing, 20)
                        .padding(.bottom, 20)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateMeal) {
                CreateMealSheet(petSelector: petSelector, foodVM: foodVM) {
                    if let pet = petSelector.selectedPet {
                        Task { await mealVM.refresh(petId: pet.id) }
                    }
                }
            }
            .onChange(of: petSelector.selectedPet?.id) { _, newId in
                guard let petId = newId else { return }
                Task {
                    await mealVM.refresh(petId: petId)
                    if let gid = petSelector.selectedPet?.groupId { await foodVM.loadFoods(groupId: gid) }
                }
            }
            .task {
                if let pet = petSelector.selectedPet {
                    await mealVM.refresh(petId: pet.id)
                    if let gid = pet.groupId { await foodVM.loadFoods(groupId: gid) }
                }
            }
        }
    }
}

// MARK: - Today Summary

struct TodaySummaryCard: View {
    let summary: TodaySummary
    let calorieTarget: Int?

    var progress: Double {
        guard let target = calorieTarget, target > 0, let total = summary.totalCalories else { return 0 }
        return min(total / Double(target), 1.0)
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Today")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(Int(summary.totalCalories ?? 0)) / \(calorieTarget ?? 0) kcal")
                    .font(.subheadline).foregroundStyle(Color.textSecondary)
            }

            ProgressView(value: progress)
                .tint(progress > 0.9 ? Color.danger : Color.accentTeal)
                .scaleEffect(y: 2, anchor: .center)

            if let dist = summary.mealDistribution {
                HStack(spacing: 0) {
                    ForEach(["breakfast", "lunch", "dinner", "snack"], id: \.self) { type in
                        VStack(spacing: 2) {
                            Text("\(dist[type] ?? 0)")
                                .font(.headline).foregroundStyle(Color.textPrimary)
                            Text(type.capitalized)
                                .font(.caption2).foregroundStyle(Color.textTertiary)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - Calorie Chart

struct CalorieChartCard: View {
    let meals: [Meal]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Calorie Intake")
                .font(.headline).foregroundStyle(Color.textPrimary)

            Chart {
                ForEach(meals, id: \.id) { meal in
                    BarMark(
                        x: .value("Date", meal.fedAt?.prefix(10).description ?? ""),
                        y: .value("Calories", meal.calories ?? 0)
                    )
                    .foregroundStyle(colorForMealType(meal.mealType))
                }
            }
            .chartYAxis {
                AxisMarks { AxisGridLine().foregroundStyle(Color.borderSubtle) }
            }
            .frame(height: 200)
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }

    private func colorForMealType(_ type: String?) -> Color {
        switch type {
        case "breakfast": return .chartPink
        case "lunch": return .chartTeal
        case "dinner": return .chartPurple
        case "snack": return .chartBlue
        default: return .chartGray
        }
    }
}

// MARK: - Meal List

struct MealListSection: View {
    let meals: [Meal]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Recent Meals")
                .font(.headline).foregroundStyle(Color.textPrimary)
                .padding(.horizontal)

            if meals.isEmpty {
                Text("No meals recorded yet")
                    .foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding()
            } else {
                ForEach(meals) { meal in
                    MealRow(meal: meal)
                }
            }
        }
    }
}

struct MealRow: View {
    let meal: Meal

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    if let type = meal.mealType {
                        Text(type.capitalized)
                            .font(.caption).fontWeight(.semibold)
                            .padding(.horizontal, 8).padding(.vertical, 2)
                            .background(Color.accentTeal.opacity(0.2))
                            .foregroundStyle(Color.accentTeal)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    Text(meal.foodDetails?.displayName ?? "Unknown Food")
                        .font(.subheadline).fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                        .lineLimit(1)
                }
                if let fedAt = meal.fedAt {
                    Text(fedAt.prefix(16).replacingOccurrences(of: "T", with: " "))
                        .font(.caption).foregroundStyle(Color.textTertiary)
                }
            }
            Spacer()
            Text("\(Int(meal.calories ?? 0)) kcal")
                .font(.subheadline).fontWeight(.semibold)
                .foregroundStyle(Color.accentPink)
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }
}

// MARK: - Create Meal Sheet

struct CreateMealSheet: View {
    var petSelector: PetSelectorViewModel
    var foodVM: FoodViewModel
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var selectedFoodId: String?
    @State private var mealType = "breakfast"
    @State private var servingAmount = ""
    @State private var servingType = "grams"
    @State private var isCreating = false
    @State private var errorMessage: String?

    let mealTypes = ["breakfast", "lunch", "dinner", "snack"]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Food") {
                        Picker("Select Food", selection: $selectedFoodId) {
                            Text("Choose...").tag(nil as String?)
                            ForEach(foodVM.foods) { food in
                                Text(food.displayName).tag(food.id as String?)
                            }
                        }
                    }
                    Section("Details") {
                        Picker("Meal Type", selection: $mealType) {
                            ForEach(mealTypes, id: \.self) { Text($0.capitalized) }
                        }
                        TextField("Amount", text: $servingAmount)
                            .keyboardType(.decimalPad)
                        Picker("Serving Type", selection: $servingType) {
                            ForEach(["grams", "units"], id: \.self) { Text($0.capitalized) }
                        }
                    }
                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(Color.danger) }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Log Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { createMeal() }
                        .disabled(selectedFoodId == nil || isCreating)
                }
            }
        }
    }

    private func createMeal() {
        guard let petId = petSelector.selectedPet?.id, let foodId = selectedFoodId else { return }
        isCreating = true
        Task {
            do {
                let request = CreateMealRequest(
                    petId: petId, foodId: foodId, mealType: mealType,
                    servingType: servingType, servingAmount: Double(servingAmount),
                    fedAt: nil, notes: nil
                )
                _ = try await APIClient.shared.createMeal(request)
                onCreated()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isCreating = false
        }
    }
}

extension MealFoodDetails {
    var displayName: String {
        [brand, productName].compactMap { $0 }.joined(separator: " - ")
    }
}
