// 10 Medicine — active courses, "mark given" actions, and recent administrations.

import SwiftUI

struct MedicinePageView: View {
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var medicine: MedicineStore
    @Environment(\.theme) private var theme
    @State private var addCourseOpen = false
    @State private var addMedicationOpen = false

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    ScreenHeader(kicker: "\(pets.selectedPet?.name ?? "—") · Meds", title: "Medicine") {
                        Menu {
                            Button("New course") { addCourseOpen = true }
                            Button("New medication") { addMedicationOpen = true }
                        } label: {
                            Image(systemName: "ellipsis")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundStyle(theme.textSecondary)
                                .frame(width: 36, height: 36)
                                .background(theme.surface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .stroke(theme.border, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        }
                    }

                    if pets.selectedPet != nil {
                        SectionLabel(text: "Active courses · \(medicine.courses.count)")
                            .padding(.horizontal, 20)
                            .padding(.bottom, 8)
                        VStack(spacing: 12) {
                            ForEach(medicine.courses) { course in
                                courseCard(course)
                            }
                            if medicine.courses.isEmpty {
                                Text("No active courses. Tap the menu to add one.")
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.textMuted)
                                    .padding(.vertical, 12)
                            }
                        }
                        .padding(.horizontal, 20)

                        SectionLabel(text: "Today's schedule")
                            .padding(.horizontal, 20)
                            .padding(.top, 24).padding(.bottom, 8)
                        VStack(spacing: 8) {
                            ForEach(medicine.todaySchedule?.scheduledItems ?? []) { item in
                                scheduleRow(item)
                            }
                            ForEach(medicine.todaySchedule?.adHocLogs ?? []) { lg in
                                adHocRow(lg)
                            }
                            if let s = medicine.todaySchedule, s.scheduledItems.isEmpty, s.adHocLogs.isEmpty {
                                Text("Nothing scheduled or given yet today.")
                                    .font(.system(size: 13))
                                    .foregroundStyle(theme.textMuted)
                                    .padding(.vertical, 12)
                            }
                        }
                        .padding(.horizontal, 20)
                    } else {
                        Text("Select a pet to manage their meds.")
                            .font(.system(size: 13))
                            .foregroundStyle(theme.textMuted)
                            .padding(20)
                    }
                    Spacer(minLength: 140)
                }
            }
            if pets.selectedPet != nil {
                FloatingActionButton(icon: "plus") {
                    addCourseOpen = true
                }
                .padding(.trailing, 18).padding(.bottom, 96)
            }
        }
        .background(theme.bg)
        .task(id: pets.selectedPetId) {
            guard let pet = pets.selectedPet else { return }
            await medicine.loadMedications(groupId: pet.groupId)
            await medicine.loadCourses(petId: pet.id)
            await medicine.loadToday(petId: pet.id)
        }
        .sheet(isPresented: $addMedicationOpen) {
            if let pet = pets.selectedPet {
                AddMedicationSheet(groupId: pet.groupId) { addMedicationOpen = false }
            }
        }
        .sheet(isPresented: $addCourseOpen) {
            if let pet = pets.selectedPet {
                AddCourseSheet(petId: pet.id, groupId: pet.groupId) { addCourseOpen = false }
            }
        }
    }

    private func courseCard(_ course: TreatmentCourseInfo) -> some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(course.medicationName)
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(theme.textPrimary)
                        Text("\(course.medicationType.displayName)")
                            .font(.system(size: 12))
                            .foregroundStyle(theme.textSecondary)
                    }
                    Spacer()
                    Pill(label: course.frequencyDays == 1 ? "Daily" : "Every \(course.frequencyDays)d")
                }
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Dose").font(.system(size: 11, weight: .medium)).foregroundStyle(theme.textMuted)
                        Text(String(format: "%g %@", course.dosage, course.dosageUnit.displayName.lowercased()))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(theme.textPrimary)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Schedule").font(.system(size: 11, weight: .medium)).foregroundStyle(theme.textMuted)
                        Text(course.timesPerDay.map(\.displayName).joined(separator: ", "))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(theme.textPrimary)
                    }
                }
                HStack {
                    Text(course.endDate.map { "Ends \(AppFormat.shortDay($0))" } ?? "Ongoing")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.textMuted)
                    Spacer()
                    Button {
                        Task { await medicine.endCourse(course.id, petId: course.petId) }
                    } label: {
                        Text("End course")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(theme.danger)
                    }
                }
            }
        }
    }

    private func scheduleRow(_ item: ScheduledItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 22))
                .foregroundStyle(item.isDone ? theme.success : theme.borderStrong)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.medicationName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("\(item.timeOfDay.displayName) · \(String(format: "%g", item.dosage)) \(item.dosageUnit.displayName.lowercased())")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            if !item.isDone {
                Button {
                    Task {
                        if let course = medicine.courses.first(where: { $0.id == item.courseId }) {
                            _ = await medicine.markGiven(course: course, slot: item.timeOfDay)
                        }
                    }
                } label: {
                    Text("Mark given")
                        .font(.system(size: 12, weight: .semibold))
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(theme.primarySoft)
                        .foregroundStyle(theme.primary)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(12)
        .background(theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func adHocRow(_ lg: MedicationLogInfo) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "syringe.fill")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(theme.primary)
                .frame(width: 32, height: 32)
                .background(theme.primarySoft)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(lg.medicationName)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("\(AppFormat.time(lg.administeredAt)) · ad-hoc by \(lg.administeredByName ?? "—")")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            Text("\(String(format: "%g", lg.dosage)) \(lg.dosageUnit.displayName.lowercased())")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.textSecondary)
        }
        .padding(12)
        .background(theme.surfaceElev)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

// MARK: - Add Medication sheet

struct AddMedicationSheet: View {
    let groupId: String
    var onDone: () -> Void
    @EnvironmentObject var medicine: MedicineStore
    @Environment(\.theme) private var theme

    @State private var name = ""
    @State private var type: MedicationType = .oral
    @State private var unit: DosageUnit = .tablet
    @State private var defaultDosage: String = ""
    @State private var notes: String = ""
    @State private var saving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    labeledField("Name", text: $name)
                    pickerCol("Type", selection: $type, options: MedicationType.allCases.map { ($0, $0.displayName) })
                    pickerCol("Unit", selection: $unit, options: DosageUnit.allCases.map { ($0, $0.displayName) })
                    labeledField("Default dosage (optional)", text: $defaultDosage)
                        .keyboardType(.decimalPad)
                    labeledField("Notes (optional)", text: $notes)
                }
                .padding(20)
            }
            .background(theme.bg)
            .navigationTitle("New medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { onDone() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() }
                        else { Text("Save").fontWeight(.semibold) }
                    }
                    .disabled(name.isEmpty || saving)
                }
            }
        }
    }

    private func save() async {
        saving = true; defer { saving = false }
        let req = CreateMedicationRequest(
            groupId: groupId, name: name,
            medicationType: type, dosageUnit: unit,
            defaultDosage: Double(defaultDosage),
            notes: notes.isEmpty ? nil : notes
        )
        if await medicine.createMedication(req) != nil { onDone() }
    }

    private func labeledField(_ label: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(theme.textMuted)
            TextField("", text: text)
                .padding(12)
                .background(theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(theme.borderStrong, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                .foregroundStyle(theme.textPrimary)
        }
    }

    private func pickerCol<V: Hashable>(_ label: String, selection: Binding<V>, options: [(V, String)]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(theme.textMuted)
            Menu {
                ForEach(options, id: \.0) { (v, t) in
                    Button(t) { selection.wrappedValue = v }
                }
            } label: {
                HStack {
                    Text(options.first(where: { $0.0 == selection.wrappedValue })?.1 ?? "")
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
        }
    }
}

// MARK: - Add Course sheet

struct AddCourseSheet: View {
    let petId: String
    let groupId: String
    var onDone: () -> Void
    @EnvironmentObject var medicine: MedicineStore
    @Environment(\.theme) private var theme

    @State private var selected: MedicationInfo?
    @State private var dosage: String = ""
    @State private var unit: DosageUnit = .tablet
    @State private var frequencyDays: Int = 1
    @State private var times: Set<TimeOfDay> = [.morning]
    @State private var startDate: Date = .init()
    @State private var endDate: Date? = nil
    @State private var notes: String = ""
    @State private var saving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    SectionLabel(text: "Medication")
                    Menu {
                        ForEach(medicine.medications) { m in
                            Button(m.name) { selected = m; unit = m.dosageUnit }
                        }
                    } label: {
                        HStack {
                            Text(selected?.name ?? "Choose a medication")
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

                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("DOSE").font(.system(size: 11, weight: .semibold)).tracking(0.6).foregroundStyle(theme.textMuted)
                            TextField("", text: $dosage)
                                .keyboardType(.decimalPad)
                                .padding(12)
                                .background(theme.surface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                                        .stroke(theme.borderStrong, lineWidth: 1)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            Text("EVERY (DAYS)").font(.system(size: 11, weight: .semibold)).tracking(0.6).foregroundStyle(theme.textMuted)
                            Stepper(value: $frequencyDays, in: 1...365) {
                                Text("\(frequencyDays)").foregroundStyle(theme.textPrimary)
                            }
                            .padding(8)
                            .background(theme.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(theme.borderStrong, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }

                    SectionLabel(text: "Times per day")
                    HStack(spacing: 8) {
                        ForEach(TimeOfDay.allCases) { t in
                            Button {
                                if times.contains(t) { times.remove(t) } else { times.insert(t) }
                                if times.isEmpty { times.insert(.morning) }
                            } label: {
                                Chip(t.displayName, active: times.contains(t))
                            }
                            .buttonStyle(.plain)
                        }
                    }

                    SectionLabel(text: "Start date")
                    DatePicker("", selection: $startDate, displayedComponents: .date).labelsHidden()
                    SectionLabel(text: "Notes (optional)")
                    TextField("", text: $notes)
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
            .navigationTitle("New course")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { onDone() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button { Task { await save() } } label: {
                        if saving { ProgressView() } else { Text("Save").fontWeight(.semibold) }
                    }
                    .disabled(selected == nil || (Double(dosage) ?? 0) <= 0 || saving)
                }
            }
            .task { await medicine.loadMedications(groupId: groupId) }
        }
    }

    private func save() async {
        guard let med = selected, let d = Double(dosage), !times.isEmpty else { return }
        saving = true; defer { saving = false }
        let req = CreateCourseRequest(
            petId: petId, medicationId: med.id,
            dosage: d, dosageUnit: unit,
            startDate: startDate, endDate: endDate,
            frequencyDays: frequencyDays,
            timesPerDay: Array(times),
            notes: notes.isEmpty ? nil : notes
        )
        if await medicine.createCourse(req) != nil { onDone() }
    }
}
