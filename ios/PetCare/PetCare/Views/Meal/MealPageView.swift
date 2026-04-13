import SwiftUI
import Charts

struct MealPageView: View {
    var dataStore: DataStore
    @State private var showCreateMeal = false
    @State private var selectedMealGroup: MealGroup?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Meals", dataStore: dataStore) {
                            if let petId = dataStore.currentPetId {
                                await dataStore.refreshMeals(petId: petId)
                                await dataStore.refreshTodaySummary(petId: petId)
                            }
                            if let gid = dataStore.currentGroupId {
                                await dataStore.refreshFoods(groupId: gid)
                            }
                        }

                        if let pet = dataStore.selectedPet {
                            if let summary = dataStore.todaySummary {
                                TodaySummaryCard(summary: summary, calorieTarget: pet.dailyCalorieTarget)
                            }

                            WeeklyCalorieChart(meals: dataStore.meals, calorieTarget: pet.dailyCalorieTarget)

                            GroupedMealList(meals: dataStore.meals, onSelectGroup: { selectedMealGroup = $0 })

                            Divider().background(Color.borderSubtle).padding(.horizontal)

                            FoodDatabaseSection(dataStore: dataStore)
                        } else {
                            Text("Select a pet to view meals")
                                .foregroundStyle(Color.textTertiary).padding(.top, 40)
                        }

                        Spacer().frame(height: 80)
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
                        .padding(.trailing, 20).padding(.bottom, 20)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateMeal) {
                CreateMealSheet(dataStore: dataStore) {
                    if let petId = dataStore.currentPetId {
                        Task {
                            await dataStore.refreshMeals(petId: petId)
                            await dataStore.refreshTodaySummary(petId: petId)
                        }
                    }
                }
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
            }
            .sheet(item: $selectedMealGroup) { group in
                MealGroupDetailSheet(group: group)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
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
                Text("Today").font(.headline).foregroundStyle(Color.textPrimary)
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
                            Text("\(dist[type] ?? 0)").font(.headline).foregroundStyle(Color.textPrimary)
                            Text(type.capitalized).font(.caption2).foregroundStyle(Color.textTertiary)
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

// MARK: - Weekly Calorie Chart (Mon-Sun, stacked bars, target line, interactive)

struct WeeklyCalorieChart: View {
    let meals: [Meal]
    let calorieTarget: Int?

    private let mealTypes = ["breakfast", "lunch", "dinner", "snack", "other"]

    struct ChartEntry: Identifiable {
        let id = UUID()
        let label: String
        let mealType: String
        let calories: Double
    }

    var chartEntries: [ChartEntry] {
        let cal = Calendar(identifier: .iso8601)
        let today = Date()
        let weekday = cal.component(.weekday, from: today)
        let mondayOffset = weekday == 1 ? -6 : -(weekday - 2)
        let monday = cal.date(byAdding: .day, value: mondayOffset, to: today)!

        let dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        let dateFmt = DateFormatter()
        dateFmt.dateFormat = "yyyy-MM-dd"
        let shortFmt = DateFormatter()
        shortFmt.dateFormat = "M/d"

        var entries: [ChartEntry] = []
        for i in 0..<7 {
            let date = cal.date(byAdding: .day, value: i, to: monday)!
            let dateStr = dateFmt.string(from: date)
            let label = "\(dayNames[i])\n\(shortFmt.string(from: date))"

            var dayCals: [String: Double] = [:]
            for meal in meals {
                guard meal.dateString == dateStr else { continue }
                let type = mealTypes.contains(meal.mealType ?? "") ? (meal.mealType ?? "other") : "other"
                dayCals[type, default: 0] += meal.calories ?? 0
            }
            for type in mealTypes {
                entries.append(ChartEntry(label: label, mealType: type, calories: dayCals[type] ?? 0))
            }
        }
        return entries
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("This Week").font(.headline).foregroundStyle(Color.textPrimary)

            Chart {
                ForEach(chartEntries) { entry in
                    BarMark(
                        x: .value("Day", entry.label),
                        y: .value("Calories", entry.calories),
                        stacking: .standard
                    )
                    .foregroundStyle(by: .value("Meal", entry.mealType))
                    .cornerRadius(3)
                }

                if let target = calorieTarget {
                    RuleMark(y: .value("Target", target))
                        .foregroundStyle(Color.warning.opacity(0.7))
                        .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                        .annotation(position: .top, alignment: .trailing) {
                            Text("Target \(target)")
                                .font(.caption2).foregroundStyle(Color.warning)
                        }
                }
            }
            .chartForegroundStyleScale([
                "breakfast": Color.chartPink,
                "lunch": Color.chartTeal,
                "dinner": Color.chartPurple,
                "snack": Color.chartBlue,
                "other": Color.chartGray,
            ])
            .chartXAxis {
                AxisMarks { value in
                    AxisValueLabel {
                        if let s = value.as(String.self) {
                            Text(s).font(.caption2).multilineTextAlignment(.center)
                        }
                    }
                }
            }
            .chartYAxis {
                AxisMarks { AxisGridLine().foregroundStyle(Color.borderSubtle) }
            }
            .chartLegend(position: .bottom, spacing: 8)
            .frame(height: 220)
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - Grouped Meal List (grouped by day + meal type)

struct MealGroup: Identifiable {
    let id: String // "2026-04-12_breakfast"
    let date: String
    let mealType: String
    let meals: [Meal]

    var totalCalories: Double { meals.compactMap(\.calories).reduce(0, +) }
    var foodNames: String { meals.map(\.displayFoodName).joined(separator: ", ") }
}

struct GroupedMealList: View {
    let meals: [Meal]
    var onSelectGroup: (MealGroup) -> Void

    var groups: [MealGroup] {
        var dict: [String: [Meal]] = [:]
        for meal in meals {
            let key = "\(meal.dateString)_\(meal.mealType ?? "other")"
            dict[key, default: []].append(meal)
        }
        return dict.map { key, meals in
            let parts = key.split(separator: "_", maxSplits: 1)
            let date = String(parts.first ?? "")
            let type = parts.count > 1 ? String(parts.last!) : "other"
            return MealGroup(id: key, date: date, mealType: type, meals: meals)
        }
        .sorted { a, b in
            if a.date != b.date { return a.date > b.date }
            return a.mealType < b.mealType
        }
    }

    var displayGroups: [MealGroup] { Array(groups.prefix(10)) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Recent Meals").font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(meals.count) meals").font(.caption).foregroundStyle(Color.textTertiary)
            }
            .padding(.horizontal)

            if groups.isEmpty {
                Text("No meals recorded yet")
                    .foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity).padding()
            } else {
                ForEach(displayGroups) { group in
                    Button { onSelectGroup(group) } label: {
                        MealGroupRow(group: group)
                    }
                }

                if groups.count > 10 {
                    Text("Showing 10 of \(groups.count) meal groups")
                        .font(.caption).foregroundStyle(Color.textTertiary)
                        .frame(maxWidth: .infinity).padding(.top, 4)
                }
            }
        }
    }
}

struct MealGroupRow: View {
    let group: MealGroup

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: mealTypeIcon(group.mealType))
                .font(.body)
                .foregroundStyle(mealTypeColor(group.mealType))
                .frame(width: 36, height: 36)
                .background(mealTypeColor(group.mealType).opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 6) {
                    Text(group.mealType.capitalized)
                        .font(.subheadline).fontWeight(.semibold)
                        .foregroundStyle(Color.textPrimary)
                    Text("×\(group.meals.count)")
                        .font(.caption2).fontWeight(.bold)
                        .padding(.horizontal, 5).padding(.vertical, 1)
                        .background(Color.surface3)
                        .foregroundStyle(Color.textSecondary)
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                Text(group.foodNames)
                    .font(.caption).foregroundStyle(Color.textTertiary)
                    .lineLimit(1)
                Text(group.date)
                    .font(.caption2).foregroundStyle(Color.textDisabled)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Int(group.totalCalories))")
                    .font(.headline).fontWeight(.bold).foregroundStyle(Color.accentPink)
                Text("kcal").font(.caption2).foregroundStyle(Color.textTertiary)
            }

            Image(systemName: "chevron.right")
                .font(.caption2).foregroundStyle(Color.textDisabled)
        }
        .padding(.horizontal, 14).padding(.vertical, 10)
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    private func mealTypeIcon(_ type: String) -> String {
        switch type {
        case "breakfast": return "sunrise"
        case "lunch": return "sun.max"
        case "dinner": return "moon.stars"
        case "snack": return "cup.and.saucer"
        default: return "fork.knife"
        }
    }

    private func mealTypeColor(_ type: String) -> Color {
        switch type {
        case "breakfast": return .chartPink
        case "lunch": return .chartTeal
        case "dinner": return .chartPurple
        case "snack": return .chartBlue
        default: return .chartGray
        }
    }
}

// MARK: - Meal Group Detail Sheet (individual meals in a day's meal type)

struct MealGroupDetailSheet: View {
    let group: MealGroup
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 10) {
                    // Summary header
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(group.date).font(.subheadline).foregroundStyle(Color.textSecondary)
                            Text("\(group.meals.count) items").font(.caption).foregroundStyle(Color.textTertiary)
                        }
                        Spacer()
                        Text("\(Int(group.totalCalories)) kcal")
                            .font(.title3).fontWeight(.bold).foregroundStyle(Color.accentPink)
                    }
                    .padding()
                    .background(Color.surface1)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                    // Individual meals
                    ForEach(group.meals) { meal in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(meal.displayFoodName)
                                    .font(.subheadline).fontWeight(.medium)
                                    .foregroundStyle(Color.textPrimary)

                                HStack(spacing: 8) {
                                    if let amount = meal.servingAmount, let sType = meal.servingType {
                                        Text("\(String(format: "%.0f", amount)) \(sType)")
                                            .font(.caption).foregroundStyle(Color.textTertiary)
                                    }
                                    if let ts = meal.timestamp {
                                        Text(String(ts.suffix(8).prefix(5))) // HH:MM
                                            .font(.caption).foregroundStyle(Color.textDisabled)
                                    }
                                    if let by = meal.fedByName {
                                        HStack(spacing: 2) {
                                            Image(systemName: "person.fill").font(.caption2)
                                            Text(by).font(.caption)
                                        }
                                        .foregroundStyle(Color.textTertiary)
                                    }
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
                .padding(.vertical, 8)
            }
            .background(Color.surface0)
            .navigationTitle("\(group.mealType.capitalized) — \(group.date)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
            }
        }
    }
}

// MARK: - Create Meal Sheet

struct CreateMealSheet: View {
    var dataStore: DataStore
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var selectedFoodId: String?
    @State private var mealType = "breakfast"
    @State private var servingAmount = ""
    @State private var servingType = "grams"
    @State private var fedAt = Date()
    @State private var notes = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    let mealTypes = ["breakfast", "lunch", "dinner", "snack"]

    var selectedFood: Food? {
        guard let id = selectedFoodId else { return nil }
        return dataStore.foods.first { $0.id == id }
    }

    /// Estimated calories based on serving
    var estimatedCalories: String {
        guard let food = selectedFood, let cal = food.calories,
              let amount = Double(servingAmount), amount > 0 else { return "" }
        let weightG: Double
        if servingType == "units" {
            weightG = amount * (food.unitWeight ?? 100)
        } else {
            weightG = amount
        }
        let kcal = (weightG / 100.0) * cal
        return "≈ \(Int(weightG))g • ~\(Int(kcal)) kcal"
    }

    var body: some View {
        NavigationStack {
            Form {
                // Food selection
                Section("Food") {
                    Picker("Select Food", selection: $selectedFoodId) {
                        Text("Choose a food...").tag(nil as String?)
                        ForEach(dataStore.foods) { food in
                            HStack {
                                Text(food.displayName)
                                if let type = food.foodType {
                                    Text("(\(type.capitalized))").foregroundStyle(Color.textTertiary)
                                }
                            }
                            .tag(food.id as String?)
                        }
                    }
                    if let food = selectedFood {
                        HStack {
                            Text(food.calories.map { "\(Int($0)) kcal/100g" } ?? "")
                                .font(.caption).foregroundStyle(Color.accentPink)
                            if let unitW = food.unitWeight {
                                Text("• \(Int(unitW))g/unit")
                                    .font(.caption).foregroundStyle(Color.textTertiary)
                            }
                        }
                    }
                }

                // Meal details
                Section("Meal Type") {
                    // Horizontal toggle buttons like the website
                    HStack(spacing: 8) {
                        ForEach(mealTypes, id: \.self) { type in
                            Button {
                                mealType = type
                            } label: {
                                Text(type.capitalized)
                                    .font(.caption).fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(mealType == type ? mealTypeColor(type).opacity(0.2) : Color.surface2)
                                    .foregroundStyle(mealType == type ? mealTypeColor(type) : Color.textTertiary)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Section("Serving") {
                    Picker("Type", selection: $servingType) {
                        Text("Grams").tag("grams")
                        Text("Units").tag("units")
                    }
                    .pickerStyle(.segmented)

                    LabeledContent("Amount") {
                        TextField("0", text: $servingAmount)
                            .keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }

                    if !estimatedCalories.isEmpty {
                        HStack {
                            Image(systemName: "flame.fill").foregroundStyle(Color.accentPink)
                            Text(estimatedCalories)
                                .font(.subheadline).fontWeight(.medium)
                                .foregroundStyle(Color.accentPink)
                        }
                    }
                }

                Section("When") {
                    DatePicker("Fed at", selection: $fedAt, in: ...Date(), displayedComponents: [.date, .hourAndMinute])
                }

                Section("Notes") {
                    TextField("Optional notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(Color.danger) }
                }
            }
            .navigationTitle("Log Meal").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isCreating ? "Saving..." : "Save") { createMeal() }
                        .disabled(selectedFoodId == nil || servingAmount.isEmpty || isCreating)
                }
            }
        }
    }

    private func createMeal() {
        guard let petId = dataStore.selectedPet?.id, let foodId = selectedFoodId else { return }
        isCreating = true
        Task {
            do {
                // Convert local date to ISO 8601 UTC string
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime]
                let fedAtStr = formatter.string(from: fedAt)

                let request = CreateMealRequest(
                    petId: petId, foodId: foodId, mealType: mealType,
                    servingType: servingType, servingAmount: Double(servingAmount),
                    fedAt: fedAtStr, notes: notes.isEmpty ? nil : notes
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

    private func mealTypeColor(_ type: String) -> Color {
        switch type {
        case "breakfast": return .chartPink
        case "lunch": return .chartTeal
        case "dinner": return .chartPurple
        case "snack": return .chartBlue
        default: return .chartGray
        }
    }
}
