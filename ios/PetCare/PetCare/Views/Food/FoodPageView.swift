import SwiftUI

struct FoodPageView: View {
    var dataStore: DataStore
    @State private var showCreateFood = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HStack {
                            Text("Food Database")
                                .font(.headline).foregroundStyle(Color.textPrimary)
                            Spacer()
                            Button { showCreateFood = true } label: {
                                Image(systemName: "plus.circle.fill")
                                    .foregroundStyle(Color.accentPink)
                            }
                        }
                        .padding(.horizontal)

                        let columns = [GridItem(.flexible()), GridItem(.flexible())]
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(dataStore.foods) { food in
                                FoodCard(food: food)
                            }
                        }
                        .padding(.horizontal)

                        if dataStore.foods.isEmpty {
                            Text("No foods in database yet")
                                .foregroundStyle(Color.textTertiary)
                                .padding(.top, 20)
                        }
                    }
                    .padding(.top, 16)
                }
            }
            .sheet(isPresented: $showCreateFood) {
                CreateFoodSheet(dataStore: dataStore)
            }
        }
    }
}

struct FoodCard: View {
    let food: Food

    var body: some View {
        VStack(spacing: 8) {
            if let url = food.photoUrl, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Image(systemName: "leaf.fill")
                        .font(.title2).foregroundStyle(Color.accentTeal)
                }
                .frame(height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                Image(systemName: "leaf.fill")
                    .font(.title2).foregroundStyle(Color.accentTeal)
                    .frame(height: 60)
            }

            VStack(spacing: 2) {
                if let brand = food.brand {
                    Text(brand).font(.caption2).foregroundStyle(Color.textTertiary).lineLimit(1)
                }
                Text(food.productName ?? "Unknown")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary).lineLimit(1)

                if let cal = food.caloriesPer100g {
                    Text("\(Int(cal)) kcal/100g")
                        .font(.caption).foregroundStyle(Color.accentPink)
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct CreateFoodSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var brand = ""
    @State private var productName = ""
    @State private var caloriesPer100g = ""
    @State private var foodType = "dry"
    @State private var isCreating = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Basic Info") {
                        TextField("Brand", text: $brand)
                        TextField("Product Name", text: $productName)
                        Picker("Type", selection: $foodType) {
                            Text("Dry").tag("dry")
                            Text("Wet").tag("wet")
                            Text("Treat").tag("treat")
                            Text("Other").tag("other")
                        }
                    }
                    Section("Nutrition") {
                        TextField("Calories per 100g", text: $caloriesPer100g)
                            .keyboardType(.decimalPad)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("New Food")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(productName.isEmpty || isCreating)
                }
            }
        }
    }

    private func save() {
        guard let gid = dataStore.currentGroupId else { return }
        isCreating = true
        Task {
            let request = CreateFoodRequest(
                brand: brand, productName: productName, foodType: foodType,
                targetPet: nil, unitWeightG: nil,
                caloriesPer100g: Double(caloriesPer100g),
                proteinPercentage: nil, fatPercentage: nil,
                moisturePercentage: nil, carbohydratePercentage: nil
            )
            _ = try? await APIClient.shared.createFood(groupId: gid, request)
            await dataStore.refreshFoods(groupId: gid)
            dismiss()
        }
    }
}
