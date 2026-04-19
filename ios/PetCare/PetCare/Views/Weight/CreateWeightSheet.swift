import SwiftUI

struct CreateWeightSheet: View {
    var dataStore: DataStore
    var onCreated: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var weightStr = ""
    @State private var notes = ""
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Weight") {
                        TextField("Weight (kg)", text: $weightStr)
                            .keyboardType(.decimalPad)
                    }
                    Section("Notes") {
                        TextField("Optional notes", text: $notes)
                    }
                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(Color.danger) }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Add Weight")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }.disabled(weightStr.isEmpty || isCreating)
                }
            }
        }
    }

    private func save() {
        guard let petId = dataStore.selectedPet?.id, let weight = Double(weightStr) else { return }
        isCreating = true
        Task {
            do {
                let request = CreateWeightRequest(petId: petId, weight: weight, timestamp: nil, notes: notes.isEmpty ? nil : notes)
                _ = try await APIClient.shared.createWeight(request)
                onCreated()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isCreating = false
        }
    }
}

