// Food catalog screens — 07 Food and 08 Add Food (modal sheet).

import SwiftUI

struct FoodView: View {
    let groupId: String
    @EnvironmentObject var foods: FoodsStore
    @Environment(\.theme) private var theme
    @State private var addOpen = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(kicker: "Catalog", title: "Foods") {
                        HStack(spacing: 8) {
                            IconButton(icon: "line.3.horizontal.decrease") {}
                            IconButton(icon: "barcode") {}
                        }
                    }
                    searchBar.padding(.horizontal, 20)
                    filterChips
                        .padding(.top, 12).padding(.horizontal, 20)
                    foodList
                        .padding(.horizontal, 20)
                        .padding(.top, 12)
                    Spacer(minLength: 120)
                }
            }
            FloatingActionButton(icon: "plus") { addOpen = true }
                .padding(.trailing, 18).padding(.bottom, 96)
        }
        .background(theme.bg)
        .task(id: refreshKey) { await foods.load(groupId: groupId) }
        .sheet(isPresented: $addOpen) {
            AddFoodSheet(groupId: groupId) { addOpen = false }
        }
    }

    private var refreshKey: String {
        "\(foods.keyword)|\(foods.foodType?.rawValue ?? "")|\(foods.targetPet?.rawValue ?? "")"
    }

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass").foregroundStyle(theme.textMuted)
            TextField("Search brand, product, ingredient", text: $foods.keyword)
                .foregroundStyle(theme.textPrimary)
                .submitLabel(.search)
                .onSubmit { Task { await foods.load(groupId: groupId) } }
        }
        .font(.system(size: 14))
        .padding(12)
        .background(theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .stroke(theme.borderStrong, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button { foods.foodType = nil } label: {
                    Chip("All", active: foods.foodType == nil)
                }.buttonStyle(.plain)
                ForEach(FoodType.allCases) { t in
                    Button { foods.foodType = (foods.foodType == t ? nil : t) } label: {
                        Chip(t.displayName, active: foods.foodType == t)
                    }.buttonStyle(.plain)
                }
                ForEach(TargetPet.allCases) { p in
                    Button { foods.targetPet = (foods.targetPet == p ? nil : p) } label: {
                        Chip("\(p.emoji) \(p.displayName)", active: foods.targetPet == p)
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private var foodList: some View {
        VStack(spacing: 0) {
            ForEach(foods.foods) { f in
                foodRow(f)
                if f.id != foods.foods.last?.id {
                    Divider().background(theme.border)
                }
            }
        }
        .background(theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func foodRow(_ f: FoodSummary) -> some View {
        HStack(spacing: 12) {
            Text(f.targetPet.emoji)
                .font(.system(size: 18))
                .frame(width: 48, height: 48)
                .background(theme.primarySoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(f.brand.uppercased())
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.4)
                        .foregroundStyle(theme.textMuted)
                    Pill(label: f.foodType.displayName,
                         color: theme.textSecondary,
                         bg: theme.surfaceElev)
                }
                Text(f.productName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("\(Int(f.calories)) kcal / 100g · For \(f.targetPet.displayName.lowercased())s")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            Button {} label: {
                Image(systemName: "plus")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.primary)
                    .frame(width: 28, height: 28)
                    .background(theme.primarySoft)
                    .clipShape(Circle())
            }
        }
        .padding(12)
    }
}

// MARK: - 08 Add Food sheet

struct AddFoodSheet: View {
    let groupId: String
    var onDone: () -> Void
    @EnvironmentObject var foods: FoodsStore
    @Environment(\.theme) private var theme

    @State private var brand = ""
    @State private var productName = ""
    @State private var foodType: FoodType = .dryFood
    @State private var targetPet: TargetPet = .dog
    @State private var unitWeight: String = "100"
    @State private var calories: String = "0"
    @State private var protein: Double = 30
    @State private var fat: Double = 15
    @State private var moisture: Double = 10
    @State private var carbs: Double = 40
    @State private var saving = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 12) {
                        photoButton
                        VStack(spacing: 8) {
                            field("Brand", text: $brand)
                            field("Product name", text: $productName)
                        }
                    }
                    HStack(spacing: 12) {
                        pickerRow("Type", selection: $foodType, options: FoodType.allCases.map { ($0, $0.displayName) })
                        pickerRow("For", selection: $targetPet, options: TargetPet.allCases.prefix(4).map { ($0, $0.displayName) })
                    }
                    Text("MACROS · PER 100G")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.6)
                        .foregroundStyle(theme.textMuted)
                    macroSlider("Protein", value: $protein)
                    macroSlider("Fat", value: $fat)
                    macroSlider("Moisture", value: $moisture)
                    macroSlider("Carbs", value: $carbs)
                    HStack(spacing: 12) {
                        field("Calories (kcal/100g)", text: $calories).keyboardType(.decimalPad)
                        field("Unit weight (g)", text: $unitWeight).keyboardType(.decimalPad)
                    }
                    if let err = error {
                        Text(err).font(.system(size: 12)).foregroundStyle(theme.danger)
                    }
                }
                .padding(20)
            }
            .background(theme.bg)
            .navigationTitle("New food")
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
                    .disabled(brand.isEmpty || productName.isEmpty || saving)
                }
            }
        }
    }

    private var photoButton: some View {
        VStack(spacing: 4) {
            Image(systemName: "camera")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(theme.primary)
            Text("Photo")
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(theme.primary)
        }
        .frame(width: 72, height: 72)
        .background(theme.primarySoft)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(theme.textMuted)
            TextField("", text: text)
                .padding(10)
                .background(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(theme.borderStrong, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .foregroundStyle(theme.textPrimary)
        }
    }

    private func pickerRow<V: Hashable>(_ label: String, selection: Binding<V>, options: [(V, String)]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(theme.textMuted)
            Picker("", selection: selection) {
                ForEach(options, id: \.0) { (v, t) in Text(t).tag(v) }
            }
            .pickerStyle(.segmented)
        }
    }

    private func macroSlider(_ label: String, value: Binding<Double>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
                Spacer()
                Text(String(format: "%.0f%%", value.wrappedValue))
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
            }
            Slider(value: value, in: 0...100, step: 1)
                .tint(theme.primary)
        }
    }

    private func save() async {
        guard !saving else { return }
        saving = true; defer { saving = false }
        let total = protein + fat + moisture + carbs
        if total > 105 {
            error = "Macros sum to \(Int(total))% (max 105%)"; return
        }
        let req = CreateFoodRequest(
            groupId: groupId,
            brand: brand,
            productName: productName,
            foodType: foodType,
            targetPet: targetPet,
            unitWeight: Double(unitWeight) ?? 100,
            calories: Double(calories) ?? 0,
            protein: protein, fat: fat, moisture: moisture, carbohydrate: carbs
        )
        if await foods.create(req) != nil { onDone() }
        else { error = foods.lastError }
    }
}
