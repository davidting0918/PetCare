import SwiftUI

struct WeightDetailSheet: View {
    var dataStore: DataStore
    let record: WeightRecord
    var onChanged: () -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var isEditing = false
    @State private var weightStr: String
    @State private var notes: String
    @State private var isSaving = false
    @State private var showDeleteConfirm = false
    @State private var errorMessage: String?

    init(dataStore: DataStore, record: WeightRecord, onChanged: @escaping () -> Void) {
        self.dataStore = dataStore
        self.record = record
        self.onChanged = onChanged
        _weightStr = State(initialValue: String(format: "%.2f", record.weightKg))
        _notes = State(initialValue: record.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                if isEditing {
                    editContent
                } else {
                    viewContent
                }
            }
            .navigationTitle(isEditing ? "Edit Weight" : "Weight Detail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isEditing ? "Cancel" : "Done") {
                        if isEditing {
                            // Reset fields and exit edit mode
                            weightStr = String(format: "%.2f", record.weightKg)
                            notes = record.notes ?? ""
                            isEditing = false
                        } else {
                            dismiss()
                        }
                    }
                }
                if isEditing {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { save() }
                            .disabled(weightStr.isEmpty || isSaving)
                    }
                }
            }
            .confirmationDialog("Delete this weight record?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { deleteRecord() }
            }
        }
    }

    // MARK: - View mode

    private var viewContent: some View {
        List {
            Section {
                LabeledContent("Weight") {
                    Text(String(format: "%.2f kg", record.weightKg))
                        .fontWeight(.semibold)
                }
                if let ts = record.timestamp {
                    LabeledContent("Date") {
                        Text(ts.prefix(16).replacingOccurrences(of: "T", with: " "))
                    }
                }
                if let by = record.recordedByName {
                    LabeledContent("Recorded by") { Text(by) }
                }
                if let n = record.notes, !n.isEmpty {
                    LabeledContent("Notes") { Text(n) }
                }
            }

            if let error = errorMessage {
                Section { Text(error).foregroundStyle(Color.danger) }
            }

            Section {
                Button { isEditing = true } label: {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive) { showDeleteConfirm = true } label: {
                    Label("Delete", systemImage: "trash")
                }
            }
        }
        .scrollContentBackground(.hidden)
    }

    // MARK: - Edit mode

    private var editContent: some View {
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

    // MARK: - Actions

    private func save() {
        guard let weight = Double(weightStr) else { return }
        isSaving = true
        errorMessage = nil
        Task {
            do {
                let request = UpdateWeightRequest(
                    weight: weight,
                    timestamp: nil,
                    notes: notes.isEmpty ? nil : notes
                )
                _ = try await APIClient.shared.updateWeight(weightId: record.id, request)
                onChanged()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }

    private func deleteRecord() {
        isSaving = true
        errorMessage = nil
        Task {
            do {
                try await APIClient.shared.deleteWeight(weightId: record.id)
                onChanged()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }
}
