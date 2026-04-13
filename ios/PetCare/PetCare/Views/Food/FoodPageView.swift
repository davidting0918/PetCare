import SwiftUI
import PhotosUI

// MARK: - Food Database Section (embedded in Meal page)

struct FoodDatabaseSection: View {
    var dataStore: DataStore
    @State private var showCreateFood = false
    @State private var selectedFood: Food?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Food Database")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { showCreateFood = true } label: {
                    Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            if dataStore.foods.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "leaf").font(.title2).foregroundStyle(Color.textTertiary)
                    Text("No foods yet").foregroundStyle(Color.textTertiary)
                    Text("Add foods to track calories").font(.caption).foregroundStyle(Color.textDisabled)
                }
                .frame(maxWidth: .infinity).padding()
            } else {
                let columns = [GridItem(.flexible()), GridItem(.flexible())]
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(dataStore.foods) { food in
                        FoodCard(food: food) { selectedFood = food }
                    }
                }
                .padding(.horizontal)
            }
        }
        .sheet(isPresented: $showCreateFood) {
            CreateFoodSheet(dataStore: dataStore)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(item: $selectedFood) { food in
            FoodDetailSheet(dataStore: dataStore, food: dataStore.getFoodDetail(foodId: food.id) ?? food)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }
}

// MARK: - Food Card

struct FoodCard: View {
    let food: Food
    var onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                // Colored icon based on food type
                Image(systemName: foodTypeIcon)
                    .font(.body)
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(foodTypeColor)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                VStack(alignment: .leading, spacing: 1) {
                    if let brand = food.brand, !brand.isEmpty {
                        Text(brand)
                            .font(.caption2).foregroundStyle(Color.textTertiary)
                            .lineLimit(1)
                    }
                    Text(food.productName ?? "Unknown")
                        .font(.caption).fontWeight(.medium)
                        .foregroundStyle(Color.textPrimary)
                        .lineLimit(1)
                    if let cal = food.calories {
                        Text("\(Int(cal)) kcal/100g")
                            .font(.caption2).foregroundStyle(Color.accentPink)
                    }
                }
                Spacer()
            }
            .padding(8)
            .background(Color.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    private var foodTypeIcon: String {
        switch food.foodType {
        case "dry": return "circle.grid.3x3.fill"
        case "wet": return "drop.fill"
        case "treat": return "star.fill"
        default: return "leaf.fill"
        }
    }

    private var foodTypeColor: Color {
        switch food.foodType {
        case "dry": return .accentBlue
        case "wet": return .accentTeal
        case "treat": return .accentPurple
        default: return .chartGray
        }
    }
}

// MARK: - Food Detail Sheet (View + Edit + Delete)

struct FoodDetailSheet: View {
    var dataStore: DataStore
    let food: Food
    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var showDeleteConfirm = false
    @State private var brand: String
    @State private var productName: String
    @State private var foodType: String
    @State private var targetPet: String
    @State private var caloriesStr: String
    @State private var proteinStr: String
    @State private var fatStr: String
    @State private var moistureStr: String
    @State private var carbStr: String
    @State private var isSaving = false

    init(dataStore: DataStore, food: Food) {
        self.dataStore = dataStore
        self.food = food
        _brand = State(initialValue: food.brand ?? "")
        _productName = State(initialValue: food.productName ?? "")
        _foodType = State(initialValue: food.foodType ?? "dry")
        _targetPet = State(initialValue: food.targetPet ?? "dog")
        _caloriesStr = State(initialValue: food.calories.map { String(format: "%.0f", $0) } ?? "")
        _proteinStr = State(initialValue: food.protein.map { String(format: "%.1f", $0) } ?? "")
        _fatStr = State(initialValue: food.fat.map { String(format: "%.1f", $0) } ?? "")
        _moistureStr = State(initialValue: food.moisture.map { String(format: "%.1f", $0) } ?? "")
        _carbStr = State(initialValue: food.carbohydrate.map { String(format: "%.1f", $0) } ?? "")
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if isEditing { editForm } else { viewContent }
                }
                .padding(.top, 8)
            }
            .background(Color.surface0)
            .navigationTitle(food.displayName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isEditing ? "Cancel" : "Done") {
                        if isEditing { isEditing = false } else { dismiss() }
                    }
                }
                if isEditing {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { saveEdit() }.disabled(isSaving)
                    }
                }
            }
            .confirmationDialog("Delete food?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) {
                    Task {
                        try? await APIClient.shared.deleteFood(foodId: food.id)
                        if let gid = dataStore.currentGroupId { await dataStore.refreshFoods(groupId: gid) }
                        dismiss()
                    }
                }
            }
        }
    }

    private var viewContent: some View {
        VStack(spacing: 16) {
            // Food type badge with icon
            HStack(spacing: 8) {
                Image(systemName: foodTypeIcon(food.foodType))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(foodTypeColor(food.foodType))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                Text(food.foodType?.capitalized ?? "Food")
                    .font(.subheadline).fontWeight(.semibold)
                    .foregroundStyle(foodTypeColor(food.foodType))
                if let target = food.targetPet {
                    Text("• \(target.capitalized)")
                        .font(.caption).foregroundStyle(Color.textTertiary)
                }
                Spacer()
            }
            .padding(.horizontal)

            // Calorie highlight
            if let cal = food.calories {
                VStack(spacing: 4) {
                    Text("\(Int(cal))")
                        .font(.system(size: 48, weight: .bold)).foregroundStyle(Color.accentPink)
                    Text("kcal / 100g").font(.caption).foregroundStyle(Color.textTertiary)
                    if let unitW = food.unitWeight, let calPer = food.caloriesPerUnit {
                        Text("\(Int(calPer)) kcal per unit (\(Int(unitW))g)")
                            .font(.caption).foregroundStyle(Color.textSecondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal)
            }

            // Nutrition facts with progress bars
            VStack(alignment: .leading, spacing: 12) {
                Text("Nutrition Facts (per 100g)")
                    .font(.subheadline).fontWeight(.semibold).foregroundStyle(Color.textSecondary)

                NutritionBar(label: "Protein", value: food.protein, color: .accentBlue)
                NutritionBar(label: "Fat", value: food.fat, color: .warning)
                NutritionBar(label: "Moisture", value: food.moisture, color: .accentTeal)
                NutritionBar(label: "Carbs", value: food.carbohydrate, color: .accentPurple)
            }
            .padding()
            .background(Color.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)

            // Info rows
            VStack(spacing: 8) {
                if let brand = food.brand, !brand.isEmpty { InfoRow(label: "Brand", value: brand) }
                InfoRow(label: "Product", value: food.productName ?? "—")
                if let unitW = food.unitWeight { InfoRow(label: "Unit Weight", value: String(format: "%.0fg", unitW)) }
            }
            .padding()
            .background(Color.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)

            // Actions
            HStack(spacing: 12) {
                Button { isEditing = true } label: {
                    HStack { Image(systemName: "pencil"); Text("Edit") }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Color.accentTeal.opacity(0.15)).foregroundStyle(Color.accentTeal)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                Button { showDeleteConfirm = true } label: {
                    HStack { Image(systemName: "trash"); Text("Delete") }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(Color.danger.opacity(0.15)).foregroundStyle(Color.danger)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(.horizontal)
        }
    }

    private func foodTypeIcon(_ type: String?) -> String {
        switch type {
        case "dry": return "circle.grid.3x3.fill"
        case "wet": return "drop.fill"
        case "treat": return "star.fill"
        default: return "leaf.fill"
        }
    }

    private func foodTypeColor(_ type: String?) -> Color {
        switch type {
        case "dry": return .accentBlue
        case "wet": return .accentTeal
        case "treat": return .accentPurple
        default: return .chartGray
        }
    }

    private var editForm: some View {
        VStack(spacing: 12) {
            FormCard("Basic Info") {
                LabeledContent("Brand") { TextField("Brand", text: $brand).multilineTextAlignment(.trailing) }
                LabeledContent("Product") { TextField("Name", text: $productName).multilineTextAlignment(.trailing) }
                Picker("Type", selection: $foodType) {
                    Text("Dry").tag("dry"); Text("Wet").tag("wet"); Text("Treat").tag("treat"); Text("Other").tag("other")
                }
            }
            FormCard("Nutrition") {
                LabeledContent("kcal/100g") { TextField("0", text: $caloriesStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Protein %") { TextField("0", text: $proteinStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Fat %") { TextField("0", text: $fatStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Moisture %") { TextField("0", text: $moistureStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                LabeledContent("Carbs %") { TextField("0", text: $carbStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
            }
        }
        .padding(.horizontal)
    }

    private func saveEdit() {
        isSaving = true
        Task {
            let req = UpdateFoodRequest(
                brand: brand, productName: productName, foodType: foodType, targetPet: targetPet,
                unitWeight: nil, calories: Double(caloriesStr),
                protein: Double(proteinStr), fat: Double(fatStr),
                moisture: Double(moistureStr), carbohydrate: Double(carbStr)
            )
            _ = try? await APIClient.shared.updateFood(foodId: food.id, req)
            if let gid = dataStore.currentGroupId { await dataStore.refreshFoods(groupId: gid) }
            isEditing = false
            isSaving = false
        }
    }
}

// MARK: - Shared helpers

struct NutritionBar: View {
    let label: String
    let value: Double?
    let color: Color

    var displayValue: Double { value ?? 0 }

    var body: some View {
        HStack(spacing: 8) {
            Text(label).font(.subheadline).foregroundStyle(Color.textSecondary).frame(width: 70, alignment: .leading)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 3)
                        .fill(Color.surface2)
                        .frame(height: 6)
                    RoundedRectangle(cornerRadius: 3)
                        .fill(color)
                        .frame(width: max(0, geo.size.width * min(displayValue / 100.0, 1.0)), height: 6)
                }
                .frame(height: 6)
                .frame(maxHeight: .infinity, alignment: .center)
            }
            .frame(height: 20)

            Text(String(format: "%.1f%%", displayValue))
                .font(.caption).fontWeight(.medium)
                .foregroundStyle(displayValue > 0 ? color : Color.textDisabled)
                .frame(width: 50, alignment: .trailing)
        }
    }
}

struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label).font(.subheadline).foregroundStyle(Color.textSecondary)
            Spacer()
            Text(value).font(.subheadline).foregroundStyle(Color.textPrimary)
        }
    }
}

struct FormCard<Content: View>: View {
    let title: String
    @ViewBuilder var content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title).font(.subheadline).fontWeight(.semibold).foregroundStyle(Color.textSecondary)
            VStack(spacing: 8) { content }
                .padding()
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

// MARK: - Create Food Sheet

struct CreateFoodSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var brand = ""
    @State private var productName = ""
    @State private var foodType = "dry_food"
    @State private var targetPet = "cat"
    @State private var unitWeightStr = "100"
    @State private var caloriesStr = ""
    @State private var proteinStr = "0"
    @State private var fatStr = "0"
    @State private var moistureStr = "0"
    @State private var carbStr = "0"
    @State private var isSaving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    LabeledContent("Brand *") { TextField("Required", text: $brand).multilineTextAlignment(.trailing) }
                    LabeledContent("Product *") { TextField("Required", text: $productName).multilineTextAlignment(.trailing) }
                    Picker("Type *", selection: $foodType) {
                        Text("Dry Food").tag("dry_food")
                        Text("Wet Food").tag("wet_food")
                    }
                    Picker("Target Pet", selection: $targetPet) {
                        ForEach(PetType.allCases, id: \.self) { Text($0.rawValue.capitalized).tag($0.rawValue) }
                    }
                    LabeledContent("Unit Weight (g) *") {
                        TextField("100", text: $unitWeightStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                    }
                }
                Section("Nutrition (per 100g) *") {
                    LabeledContent("Calories *") { TextField("0", text: $caloriesStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Protein %") { TextField("0", text: $proteinStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Fat %") { TextField("0", text: $fatStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Moisture %") { TextField("0", text: $moistureStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                    LabeledContent("Carbs %") { TextField("0", text: $carbStr).keyboardType(.decimalPad).multilineTextAlignment(.trailing) }
                }
                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(Color.danger).font(.caption) }
                }
            }
            .navigationTitle("New Food").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving..." : "Save") { save() }
                        .disabled(productName.isEmpty || brand.isEmpty || caloriesStr.isEmpty || isSaving)
                }
            }
        }
    }

    private func save() {
        guard let gid = dataStore.currentGroupId else { return }
        guard let unitWeight = Double(unitWeightStr), unitWeight > 0 else {
            errorMessage = "Unit weight is required and must be > 0"
            return
        }
        guard let calories = Double(caloriesStr) else {
            errorMessage = "Calories is required"
            return
        }
        isSaving = true
        errorMessage = nil
        Task {
            let req = CreateFoodRequest(
                brand: brand, productName: productName, foodType: foodType, targetPet: targetPet,
                unitWeight: unitWeight, calories: calories,
                protein: Double(proteinStr) ?? 0, fat: Double(fatStr) ?? 0,
                moisture: Double(moistureStr) ?? 0, carbohydrate: Double(carbStr) ?? 0
            )
            do {
                _ = try await APIClient.shared.createFood(groupId: gid, req)
            } catch {
                #if DEBUG
                print("Create food failed: \(error)")
                #endif
            }
            await dataStore.refreshFoods(groupId: gid)
            dismiss()
        }
    }
}
