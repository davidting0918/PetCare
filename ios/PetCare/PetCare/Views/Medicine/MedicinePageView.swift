import SwiftUI

struct MedicinePageView: View {
    var dataStore: DataStore
    @State private var medicineVM = MedicineViewModel()
    @State private var showCreateMedication = false
    @State private var showCreateCourse = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Medicine", dataStore: dataStore) {
                            if let pet = dataStore.selectedPet, let gid = pet.groupId {
                                await medicineVM.refresh(petId: pet.id, groupId: gid)
                            }
                        }

                        if let pet = dataStore.selectedPet {
                            TodayChecklistSection(schedule: medicineVM.todaySchedule, medicineVM: medicineVM, petId: pet.id)
                            ActiveCoursesSection(courses: medicineVM.courses, medicineVM: medicineVM, petId: pet.id, onAddCourse: { showCreateCourse = true })
                            MedicationDatabaseSection(medications: medicineVM.medications, onAdd: { showCreateMedication = true })
                        } else {
                            Text("Select a pet to view medicine")
                                .foregroundStyle(Color.textTertiary)
                                .padding(.top, 40)
                        }
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateMedication) {
                CreateMedicationSheet(dataStore: dataStore, medicineVM: medicineVM)
            }
            .sheet(isPresented: $showCreateCourse) {
                CreateCourseSheet(dataStore: dataStore, medicineVM: medicineVM)
            }
            .onChange(of: dataStore.selectedPet?.id) { _, _ in loadAll() }
            .task { loadAll() }
        }
    }

    private func loadAll() {
        guard let pet = dataStore.selectedPet, let gid = pet.groupId else { return }
        Task { await medicineVM.refresh(petId: pet.id, groupId: gid) }
    }
}

// MARK: - Today Checklist

struct TodayChecklistSection: View {
    let schedule: TodaySchedule?
    var medicineVM: MedicineViewModel
    let petId: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Today's Checklist")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                if let cs = schedule?.completionStatus {
                    Text("\(cs.totalCompleted ?? 0)/\(cs.totalRequired ?? 0)")
                        .font(.caption).fontWeight(.bold)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Color.accentTeal.opacity(0.2))
                        .foregroundStyle(Color.accentTeal)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(.horizontal)

            if let items = schedule?.scheduledCourses, !items.isEmpty {
                ForEach(items) { item in
                    ChecklistRow(item: item, medicineVM: medicineVM, petId: petId)
                }
            } else {
                Text("No medications scheduled for today")
                    .foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity).padding()
            }
        }
    }
}

struct ChecklistRow: View {
    let item: ScheduledCourseItem
    var medicineVM: MedicineViewModel
    let petId: String
    @State private var isToggling = false

    var body: some View {
        HStack {
            Image(systemName: "pills.fill")
                .foregroundStyle(Color.accentPurple)
                .frame(width: 32, height: 32)
                .background(Color.accentPurple.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(item.medicationName ?? "Unknown")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                if let dosage = item.dosage {
                    Text(dosage).font(.caption).foregroundStyle(Color.textSecondary)
                }
            }

            Spacer()

            if isToggling {
                ProgressView().tint(Color.accentTeal)
            } else if item.isFullyDone {
                Button {
                    guard let log = item.completedLogs?.last else { return }
                    isToggling = true
                    Task {
                        try? await medicineVM.undoDone(logId: log.logId ?? "", petId: petId)
                        isToggling = false
                    }
                } label: {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2).foregroundStyle(Color.success)
                }
            } else {
                Button {
                    guard let cid = item.courseId else { return }
                    isToggling = true
                    Task {
                        try? await medicineVM.markDone(courseId: cid, petId: petId)
                        isToggling = false
                    }
                } label: {
                    Image(systemName: "circle")
                        .font(.title2).foregroundStyle(Color.textTertiary)
                }
            }
        }
        .padding()
        .background(item.isFullyDone ? Color.success.opacity(0.05) : Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }
}

// MARK: - Active Courses

struct ActiveCoursesSection: View {
    let courses: [TreatmentCourse]
    var medicineVM: MedicineViewModel
    let petId: String
    var onAddCourse: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Active Courses")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onAddCourse() } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            if courses.isEmpty {
                Text("No active treatment courses")
                    .foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity).padding()
            } else {
                ForEach(courses) { course in
                    CourseRow(course: course)
                }
            }
        }
    }
}

struct CourseRow: View {
    let course: TreatmentCourse

    var body: some View {
        HStack {
            Image(systemName: "pills.fill")
                .foregroundStyle(Color.accentBlue)
                .frame(width: 32, height: 32)
                .background(Color.accentBlue.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 2) {
                Text(course.medicationName ?? "Unknown")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                HStack(spacing: 8) {
                    if let dosage = course.dosage { Text(dosage).font(.caption).foregroundStyle(Color.textSecondary) }
                    if let freq = course.frequencyDays { Text("Every \(freq)d").font(.caption).foregroundStyle(Color.textTertiary) }
                }
            }
            Spacer()
            if let start = course.startDate {
                HStack(spacing: 2) {
                    Image(systemName: "calendar").font(.caption2)
                    Text(start.prefix(10)).font(.caption)
                }
                .foregroundStyle(Color.textTertiary)
            }
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }
}

// MARK: - Medication Database

struct MedicationDatabaseSection: View {
    let medications: [Medication]
    var onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Medication Database")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onAdd() } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            let columns = [GridItem(.flexible()), GridItem(.flexible())]
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(medications) { med in
                    VStack(spacing: 6) {
                        Image(systemName: "pills.fill")
                            .font(.title2)
                            .foregroundStyle(Color.accentPurple)
                        Text(med.name)
                            .font(.subheadline).fontWeight(.medium)
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(2).multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.surface1)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
            .padding(.horizontal)
        }
    }
}

// MARK: - Create Sheets

struct CreateMedicationSheet: View {
    var dataStore: DataStore
    var medicineVM: MedicineViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Medication Name") { TextField("Name", text: $name) }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("New Medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let gid = dataStore.currentGroupId else { return }
                        Task { try? await medicineVM.createMedication(name: name, groupId: gid); dismiss() }
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

struct CreateCourseSheet: View {
    var dataStore: DataStore
    var medicineVM: MedicineViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedMedId: String?
    @State private var dosage = ""
    @State private var frequencyDays = "1"

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Medication") {
                        Picker("Select", selection: $selectedMedId) {
                            Text("Choose...").tag(nil as String?)
                            ForEach(medicineVM.medications) { med in
                                Text(med.name).tag(med.id as String?)
                            }
                        }
                    }
                    Section("Details") {
                        TextField("Dosage (e.g. 1 tablet)", text: $dosage)
                        TextField("Frequency (days)", text: $frequencyDays).keyboardType(.numberPad)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("New Course")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        guard let petId = dataStore.selectedPet?.id, let medId = selectedMedId else { return }
                        Task {
                            let req = CreateCourseRequest(
                                petId: petId, medicationId: medId,
                                dosage: dosage.isEmpty ? nil : dosage,
                                frequencyDays: Int(frequencyDays),
                                startDate: nil, endDate: nil
                            )
                            try? await medicineVM.createCourse(req, petId: petId)
                            dismiss()
                        }
                    }
                    .disabled(selectedMedId == nil)
                }
            }
        }
    }
}
