import SwiftUI

struct MedicinePageView: View {
    var dataStore: DataStore
    @State private var showCreateCourse = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        HeaderView(title: "Medicine", dataStore: dataStore) {
                            if let petId = dataStore.currentPetId, let gid = dataStore.currentGroupId {
                                await dataStore.refreshMedications(groupId: gid)
                                await dataStore.refreshCourses(petId: petId)
                                await dataStore.refreshTodaySchedule(petId: petId)
                            }
                        }

                        if dataStore.selectedPet != nil {
                            TodayChecklistCard(schedule: dataStore.todaySchedule, dataStore: dataStore, petId: dataStore.currentPetId ?? "")
                            ActiveCoursesCard(courses: dataStore.courses, onAddCourse: { showCreateCourse = true })
                        } else {
                            Text("Select a pet to view medicine")
                                .foregroundStyle(Color.textTertiary)
                                .padding(.top, 40)
                        }

                        Spacer().frame(height: 80)
                    }
                }

                // FAB
                VStack {
                    Spacer()
                    HStack {
                        Spacer()
                        Button { showCreateCourse = true } label: {
                            Image(systemName: "plus")
                                .font(.title2).fontWeight(.bold)
                                .foregroundStyle(.white)
                                .frame(width: 56, height: 56)
                                .background(Color.accentPurple)
                                .clipShape(Circle())
                                .shadow(color: Color.accentPurple.opacity(0.4), radius: 8, y: 4)
                        }
                        .padding(.trailing, 20).padding(.bottom, 20)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreateCourse) {
                CreateCourseSheet(dataStore: dataStore)
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
            }
        }
    }
}

// MARK: - Today's Checklist Card

struct TodayChecklistCard: View {
    let schedule: TodaySchedule?
    var dataStore: DataStore
    let petId: String

    private var items: [ScheduledItem] { schedule?.scheduledItems ?? [] }
    private var completed: Int { schedule?.summary?.completed ?? 0 }
    private var total: Int { schedule?.summary?.totalScheduled ?? 0 }

    private var progress: Double {
        guard total > 0 else { return 0 }
        return Double(completed) / Double(total)
    }

    var body: some View {
        VStack(spacing: 14) {
            // Header with progress ring
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .stroke(Color.surface3, lineWidth: 4)
                    Circle()
                        .trim(from: 0, to: progress)
                        .stroke(completed == total && total > 0 ? Color.success : Color.accentPurple, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    if total > 0 {
                        Image(systemName: completed == total ? "checkmark" : "pills.fill")
                            .font(.caption2).fontWeight(.bold)
                            .foregroundStyle(completed == total ? Color.success : Color.accentPurple)
                    }
                }
                .frame(width: 36, height: 36)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Today").font(.headline).foregroundStyle(Color.textPrimary)
                    Text(total > 0 ? "\(completed)/\(total) completed" : "No medications scheduled")
                        .font(.caption).foregroundStyle(Color.textTertiary)
                }

                Spacer()
            }

            if !items.isEmpty {
                Divider().background(Color.borderSubtle)

                VStack(spacing: 0) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        if index > 0 {
                            Divider().background(Color.borderSubtle).padding(.leading, 44)
                        }
                        ChecklistRow(item: item, dataStore: dataStore, petId: petId)
                    }
                }
            }
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal)
    }
}

struct ChecklistRow: View {
    let item: ScheduledItem
    var dataStore: DataStore
    let petId: String
    @State private var isToggling = false

    private var isDone: Bool { item.isDone ?? false }

    var body: some View {
        HStack(spacing: 12) {
            // Toggle button
            if isToggling {
                ProgressView().tint(Color.accentPurple).frame(width: 28, height: 28)
            } else if isDone {
                Button {
                    guard let logId = item.logId else { return }
                    isToggling = true
                    Task {
                        try? await APIClient.shared.undoMedicineDone(logId: logId)
                        await dataStore.refreshTodaySchedule(petId: petId)
                        isToggling = false
                    }
                } label: {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title3).foregroundStyle(Color.success)
                        .frame(width: 28, height: 28)
                }
            } else {
                Button {
                    guard let groupId = dataStore.currentGroupId else { return }
                    isToggling = true
                    Task {
                        let req = CreateLogRequest(
                            petId: petId,
                            medicationId: item.medicationId ?? "",
                            groupId: groupId,
                            courseId: item.courseId,
                            dosage: item.dosage ?? 0,
                            dosageUnit: item.dosageUnit ?? "tablet",
                            timeOfDay: item.timeOfDay,
                            notes: nil
                        )
                        try? await APIClient.shared.markMedicineDone(req)
                        await dataStore.refreshTodaySchedule(petId: petId)
                        isToggling = false
                    }
                } label: {
                    Image(systemName: "circle")
                        .font(.title3).foregroundStyle(Color.textDisabled)
                        .frame(width: 28, height: 28)
                }
            }

            VStack(alignment: .leading, spacing: 1) {
                Text(item.medicationName ?? "Unknown")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundStyle(isDone ? Color.textTertiary : Color.textPrimary)
                    .strikethrough(isDone, color: Color.textTertiary)
                HStack(spacing: 4) {
                    if let dosage = item.dosage {
                        Text(String(format: "%.1f", dosage))
                            .font(.caption).foregroundStyle(Color.textTertiary)
                    }
                    if let unit = item.dosageUnit, !unit.isEmpty {
                        Text(unit).font(.caption).foregroundStyle(Color.textTertiary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Active Courses Card

struct ActiveCoursesCard: View {
    let courses: [TreatmentCourse]
    var onAddCourse: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Active Courses").font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Text("\(courses.count)")
                    .font(.caption).fontWeight(.bold)
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.accentBlue.opacity(0.15))
                    .foregroundStyle(Color.accentBlue)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }

            if courses.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "pills").font(.title2).foregroundStyle(Color.textDisabled)
                    Text("No active courses")
                        .font(.subheadline).foregroundStyle(Color.textTertiary)
                    Button { onAddCourse() } label: {
                        Text("Start a Course")
                            .font(.caption).fontWeight(.semibold)
                            .padding(.horizontal, 14).padding(.vertical, 6)
                            .background(Color.accentPurple.opacity(0.15))
                            .foregroundStyle(Color.accentPurple)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(courses.enumerated()), id: \.element.id) { index, course in
                        if index > 0 {
                            Divider().background(Color.borderSubtle)
                        }
                        CourseRow(course: course)
                    }
                }
            }
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal)
    }
}

struct CourseRow: View {
    let course: TreatmentCourse

    private var daysActive: String {
        guard let start = course.startDate, start.count >= 10 else { return "" }
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        guard let startDate = fmt.date(from: String(start.prefix(10))) else { return "" }
        let days = Calendar.current.dateComponents([.day], from: startDate, to: Date()).day ?? 0
        return "Day \(days + 1)"
    }

    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.accentBlue)
                .frame(width: 4, height: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(course.medicationName ?? "Unknown")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                HStack(spacing: 6) {
                    if let dosage = course.dosage {
                        Text(String(format: "%.1f %@", dosage, course.dosageUnit ?? "dose"))
                            .font(.caption).foregroundStyle(Color.textSecondary)
                    }
                    if let freq = course.frequencyDays {
                        Text("•").font(.caption).foregroundStyle(Color.textDisabled)
                        Text("Every \(freq)d")
                            .font(.caption).foregroundStyle(Color.textSecondary)
                    }
                }
            }

            Spacer()

            if !daysActive.isEmpty {
                Text(daysActive)
                    .font(.caption2).fontWeight(.semibold)
                    .padding(.horizontal, 7).padding(.vertical, 3)
                    .background(Color.accentTeal.opacity(0.12))
                    .foregroundStyle(Color.accentTeal)
                    .clipShape(RoundedRectangle(cornerRadius: 5))
            }
        }
        .padding(.vertical, 10)
    }
}

// MARK: - Create Course Sheet

struct CreateCourseSheet: View {
    var dataStore: DataStore
    @Environment(\.dismiss) private var dismiss
    @State private var selectedMedId: String?
    @State private var dosage = "1"
    @State private var dosageUnit = "tablet"
    @State private var frequencyDays = "1"
    @State private var timeOfDay = "morning"

    let dosageUnits = ["tablet", "ml", "mg", "drop", "puff", "patch", "other"]
    let timeSlots = ["morning", "afternoon", "evening", "night", "all_day"]

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Medication") {
                        Picker("Select", selection: $selectedMedId) {
                            Text("Choose...").tag(nil as String?)
                            ForEach(dataStore.medications) { med in
                                Text(med.name).tag(med.id as String?)
                            }
                        }
                    }
                    Section("Dosage") {
                        LabeledContent("Amount") {
                            TextField("1", text: $dosage)
                                .keyboardType(.decimalPad).multilineTextAlignment(.trailing)
                        }
                        Picker("Unit", selection: $dosageUnit) {
                            ForEach(dosageUnits, id: \.self) { Text($0.capitalized).tag($0) }
                        }
                    }
                    Section("Schedule") {
                        LabeledContent("Every (days)") {
                            TextField("1", text: $frequencyDays)
                                .keyboardType(.numberPad).multilineTextAlignment(.trailing)
                        }
                        Picker("Time of Day", selection: $timeOfDay) {
                            ForEach(timeSlots, id: \.self) { Text($0.replacingOccurrences(of: "_", with: " ").capitalized).tag($0) }
                        }
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
                        guard let petId = dataStore.selectedPet?.id,
                              let groupId = dataStore.currentGroupId,
                              let medId = selectedMedId,
                              let dos = Double(dosage), dos > 0 else { return }
                        let fmt = DateFormatter()
                        fmt.dateFormat = "yyyy-MM-dd"
                        let today = fmt.string(from: Date())
                        Task {
                            let req = CreateCourseRequest(
                                petId: petId, medicationId: medId, groupId: groupId,
                                dosage: dos, dosageUnit: dosageUnit,
                                frequencyDays: Int(frequencyDays) ?? 1,
                                timesPerDay: [timeOfDay],
                                startDate: today, endDate: nil, notes: nil
                            )
                            _ = try? await APIClient.shared.createCourse(req)
                            await dataStore.refreshCourses(petId: petId)
                            await dataStore.refreshTodaySchedule(petId: petId)
                            dismiss()
                        }
                    }
                    .disabled(selectedMedId == nil)
                }
            }
        }
    }
}
