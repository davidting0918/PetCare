// Pet tab — combines four screens from the prototype:
//   03 Pet List      → PetListView
//   04 Pet Detail    → PetDetailView
//   05 Weight        → WeightView
//   06 Add Weight    → AddWeightSheet (modal)
//
// File slot is `WeightPageView.swift` from the previous PetCare build; we
// re-use it so we don't have to add new files to the Xcode project.

import Charts
import SwiftUI

// MARK: - Root navigation container for the Pet tab

struct PetPageRoot: View {
    @EnvironmentObject var pets: PetsStore
    @State private var path: [PetDestination] = []

    var body: some View {
        NavigationStack(path: $path) {
            PetListView(onSelect: { pet in
                pets.select(pet.id)
                path.append(.detail(pet.id))
            })
            .navigationDestination(for: PetDestination.self) { dest in
                switch dest {
                case .detail(let id): PetDetailView(petId: id) {
                    path.append(.weight(id))
                }
                case .weight(let id): WeightView(petId: id)
                }
            }
        }
    }
}

enum PetDestination: Hashable {
    case detail(String)
    case weight(String)
}

// MARK: - 03 Pet List

struct PetListView: View {
    var onSelect: (PetSummary) -> Void
    @EnvironmentObject var pets: PetsStore
    @State private var showAdd = false
    @Environment(\.theme) private var theme

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                ScreenHeader(kicker: "Your pets", title: "Pets") {
                    IconButton(icon: "magnifyingglass") {}
                }

                // Filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Chip("All · \(pets.pets.count)", active: true)
                        Chip("Dogs · \(pets.pets.filter { $0.petType == .dog }.count)")
                        Chip("Cats · \(pets.pets.filter { $0.petType == .cat }.count)")
                    }
                    .padding(.horizontal, 20)
                }
                .padding(.bottom, 16)

                VStack(spacing: 12) {
                    ForEach(pets.pets) { pet in
                        Button { onSelect(pet) } label: {
                            PetRow(pet: pet)
                        }
                        .buttonStyle(.plain)
                    }

                    Button { showAdd = true } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "plus")
                                .font(.system(size: 14, weight: .semibold))
                            Text("Add a pet")
                                .font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundStyle(theme.primary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(
                                    theme.borderStrong,
                                    style: StrokeStyle(lineWidth: 1, dash: [6])
                                )
                        )
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 100)
            }
            .padding(.top, 8)
        }
        .background(theme.bg)
        .refreshable { await pets.refresh() }
        .sheet(isPresented: $showAdd) { AddPetSheet() }
    }
}

private struct PetRow: View {
    let pet: PetSummary
    @Environment(\.theme) private var theme

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                LinearGradient(
                    colors: [theme.primarySoft, theme.surfaceElev],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Text(pet.petType.emoji).font(.system(size: 28))
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(theme.border, lineWidth: 1)
            )

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(pet.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(theme.textPrimary)
                    Pill(label: pet.userPermission.capitalized)
                }
                Text("\(pet.breed ?? pet.petType.displayName)\(pet.dailyCalorieTarget.map { " · \($0) kcal" } ?? "")")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.textSecondary)
                if let w = pet.currentWeightKg {
                    HStack(spacing: 4) {
                        Image(systemName: "scalemass")
                            .font(.system(size: 10))
                        Text(String(format: "%.1f kg", w))
                            .font(.system(size: 12))
                    }
                    .foregroundStyle(theme.textSecondary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.textMuted)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(theme.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

// MARK: - 04 Pet Detail

struct PetDetailView: View {
    let petId: String
    var openWeight: () -> Void
    @EnvironmentObject var pets: PetsStore
    @Environment(\.theme) private var theme

    @State private var details: PetDetails?
    @State private var tabIndex: Int = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                heroImage
                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .lastTextBaseline) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(details?.name ?? "—")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundStyle(theme.textPrimary)
                            Text(subtitle)
                                .font(.system(size: 13))
                                .foregroundStyle(theme.textSecondary)
                        }
                        Spacer()
                        IconButton(icon: "square.and.pencil") { /* TODO: edit */ }
                    }

                    statsGrid

                    SegPicker(
                        selection: $tabIndex,
                        options: [(0, "Overview"), (1, "Weight"), (2, "Meals"), (3, "Meds")]
                    )

                    if tabIndex == 0 { overviewCards }
                    if tabIndex == 1 {
                        Button {
                            openWeight()
                        } label: {
                            HStack {
                                Text("Open weight history")
                                    .font(.system(size: 14, weight: .semibold))
                                Spacer()
                                Image(systemName: "chevron.right")
                            }
                            .padding(16)
                            .foregroundStyle(theme.textPrimary)
                            .background(theme.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(theme.border, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        }
                    }
                }
                .padding(.horizontal, 20)
                Spacer(minLength: 80)
            }
        }
        .background(theme.bg)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                IconButton(icon: "ellipsis") { /* TODO: actions */ }
            }
        }
        .task { details = await pets.details(petId: petId) }
    }

    private var subtitle: String {
        guard let d = details else { return "" }
        var parts: [String] = []
        if let b = d.breed { parts.append(b) }
        parts.append(d.gender.displayName)
        if let bd = d.birthDate {
            let f = DateFormatter()
            f.dateFormat = "MMM yyyy"
            parts.append("Born \(f.string(from: bd))")
        }
        return parts.joined(separator: " · ")
    }

    private var heroImage: some View {
        ZStack {
            LinearGradient(
                colors: [theme.primarySoft, theme.surfaceElev],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            Text(details?.petType.emoji ?? "🐾")
                .font(.system(size: 80))
        }
        .frame(height: 200)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .padding(.horizontal, 20)
    }

    private var statsGrid: some View {
        HStack(spacing: 8) {
            StatTile(label: "Weight", value: details?.currentWeightKg.map { String(format: "%.1f", $0) } ?? "—", unit: "kg")
            StatTile(label: "Age", value: details?.age.map { String(format: "%.1f", $0) } ?? "—", unit: "yr")
            StatTile(label: "Daily", value: details?.dailyCalorieTarget.map { "\($0)" } ?? "—", unit: "kcal")
            StatTile(label: "Target", value: details?.targetWeightKg.map { String(format: "%.1f", $0) } ?? "—", unit: "kg")
        }
    }

    private var overviewCards: some View {
        VStack(spacing: 12) {
            CardSurface {
                VStack(alignment: .leading, spacing: 8) {
                    SectionLabel(text: "Vital snapshot")
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        kvCell("Spayed", details?.isSpayed == true ? "Yes" : "No")
                        kvCell("Microchip", details?.microchipId ?? "—")
                        kvCell("Group", details?.groupName ?? "—")
                        kvCell("Permission", details?.userPermission.capitalized ?? "—")
                    }
                }
            }
            if let notes = details?.notes, !notes.isEmpty {
                CardSurface {
                    VStack(alignment: .leading, spacing: 6) {
                        SectionLabel(text: "Notes")
                        Text(notes)
                            .font(.system(size: 14))
                            .foregroundStyle(theme.textSecondary)
                    }
                }
            }
        }
    }

    private func kvCell(_ key: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(key)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(theme.textMuted)
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(theme.textPrimary)
        }
    }
}

// MARK: - 05 Weight + 06 Add Weight sheet

struct WeightView: View {
    let petId: String
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var weights: WeightsStore
    @Environment(\.theme) private var theme

    @State private var range: WeightRange = .ninety
    @State private var addOpen = false

    enum WeightRange: String, CaseIterable, Identifiable {
        case d7 = "7D", d30 = "30D", d90 = "90D", y1 = "1Y", all = "All"
        var id: String { rawValue }
        var days: Int? {
            switch self {
            case .d7: return 7
            case .d30: return 30
            case .d90: return 90
            case .y1: return 365
            case .all: return nil
            }
        }
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(alignment: .lastTextBaseline, spacing: 8) {
                        Text(latestWeightDisplay)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(theme.textPrimary)
                        if let d = ninetyDayDelta {
                            HStack(spacing: 2) {
                                Image(systemName: d < 0 ? "arrow.down.right" : "arrow.up.right")
                                    .font(.system(size: 10, weight: .semibold))
                                Text(String(format: "%@%.1f kg · 90d", d < 0 ? "" : "+", d))
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(d < 0 ? theme.success : theme.warning)
                        }
                    }
                    if let target = pets.pets.first(where: { $0.id == petId })?.targetWeightKg,
                       let latest = weights.latest?.weight {
                        Text(String(format: "Target %.1f kg · %.1f kg to go", target, abs(latest - target)))
                            .font(.system(size: 13))
                            .foregroundStyle(theme.textSecondary)
                    }

                    SegPicker(
                        selection: $range,
                        options: WeightRange.allCases.map { ($0, $0.rawValue) }
                    )

                    CardSurface {
                        VStack(spacing: 12) {
                            BigWeightChart(records: filteredRecords, target: pets.pets.first(where: { $0.id == petId })?.targetWeightKg)
                                .frame(height: 200)
                            HStack {
                                legendDot("Weight", color: theme.chart1)
                                Spacer()
                                if let t = pets.pets.first(where: { $0.id == petId })?.targetWeightKg {
                                    legendDot(String(format: "Target %.1f kg", t), color: theme.textMuted)
                                }
                            }
                        }
                    }

                    SectionLabel(text: "Records · \(weights.records.count) entries")
                    CardSurface(padding: 0) {
                        VStack(spacing: 0) {
                            ForEach(weights.records.sorted { $0.timestamp > $1.timestamp }) { r in
                                weightRow(r)
                                if r.id != weights.records.last?.id {
                                    Divider().background(theme.border)
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 120)
            }

            FloatingActionButton(icon: "plus") { addOpen = true }
                .padding(.trailing, 18).padding(.bottom, 96)
        }
        .background(theme.bg)
        .navigationBarTitleDisplayMode(.inline)
        .navigationTitle("Weight")
        .task { await weights.load(petId: petId) }
        .sheet(isPresented: $addOpen) {
            AddWeightSheet(petId: petId) { addOpen = false }
        }
    }

    private var latestWeightDisplay: String {
        if let w = weights.latest?.weight { return String(format: "%.1f kg", w) }
        return "—"
    }

    private var ninetyDayDelta: Double? {
        guard let latest = weights.latest?.weight,
              let prior = weights.priorWeight(daysAgo: 90) else { return nil }
        return latest - prior
    }

    private var filteredRecords: [WeightSummary] {
        guard let days = range.days else { return weights.records }
        let cutoff = Calendar.current.date(byAdding: .day, value: -days, to: Date()) ?? Date()
        return weights.records.filter { $0.timestamp >= cutoff }
    }

    private func legendDot(_ text: String, color: Color) -> some View {
        HStack(spacing: 6) {
            Rectangle().fill(color).frame(width: 8, height: 8).cornerRadius(2)
            Text(text)
                .font(.system(size: 11))
                .foregroundStyle(theme.textSecondary)
        }
    }

    private func weightRow(_ r: WeightSummary) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(AppFormat.shortDay(r.timestamp))
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(theme.textPrimary)
                Text("Logged by \(r.userName)")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textMuted)
            }
            Spacer()
            Text(String(format: "%.1f kg", r.weight))
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(theme.textPrimary)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
    }
}

struct BigWeightChart: View {
    let records: [WeightSummary]
    let target: Double?
    @Environment(\.theme) private var theme

    var body: some View {
        Chart {
            ForEach(records) { r in
                LineMark(x: .value("date", r.timestamp), y: .value("kg", r.weight))
                    .foregroundStyle(theme.chart1)
                    .interpolationMethod(.monotone)
                AreaMark(x: .value("date", r.timestamp), y: .value("kg", r.weight))
                    .foregroundStyle(theme.chart1.opacity(0.10))
                    .interpolationMethod(.monotone)
            }
            if let target = target {
                RuleMark(y: .value("target", target))
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [3, 4]))
                    .foregroundStyle(theme.textMuted)
            }
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 3)) { _ in
                AxisValueLabel().foregroundStyle(theme.textMuted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .trailing, values: .automatic(desiredCount: 3)) {
                AxisGridLine().foregroundStyle(theme.border)
                AxisValueLabel().foregroundStyle(theme.textMuted)
            }
        }
    }
}

struct AddWeightSheet: View {
    let petId: String
    var onDone: () -> Void
    @EnvironmentObject var weights: WeightsStore
    @EnvironmentObject var pets: PetsStore
    @Environment(\.theme) private var theme

    @State private var weight: Double = 12.3
    @State private var notes: String = ""
    @State private var date: Date = .init()
    @State private var saving: Bool = false

    var body: some View {
        VStack(spacing: 0) {
            // Sheet header
            HStack {
                Button("Cancel") { onDone() }
                    .foregroundStyle(theme.textSecondary)
                Spacer()
                Text("Log weight")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Spacer()
                Button {
                    Task { await save() }
                } label: {
                    if saving { ProgressView().tint(theme.primary) }
                    else { Text("Save").fontWeight(.semibold).foregroundStyle(theme.primary) }
                }
                .disabled(saving)
            }
            .padding(.horizontal, 20).padding(.top, 14).padding(.bottom, 10)

            ScrollView {
                VStack(spacing: 18) {
                    // Big weight value
                    VStack(spacing: 4) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(String(format: "%.1f", weight))
                                .font(.system(size: 48, weight: .bold))
                                .foregroundStyle(theme.textPrimary)
                            Text("kg")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(theme.textMuted)
                        }
                        if let prior = weights.latest?.weight {
                            Text(String(format: "%@%.1f kg vs last entry", weight - prior < 0 ? "" : "+", weight - prior))
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(weight - prior < 0 ? theme.success : theme.warning)
                        }
                    }

                    // Tick-mark slider (uses native Slider for now)
                    VStack(spacing: 8) {
                        Slider(value: $weight, in: 1...100, step: 0.1)
                            .tint(theme.primary)
                        HStack {
                            Text("1.0 kg")
                            Spacer()
                            Text("100.0 kg")
                        }
                        .font(.system(size: 10))
                        .foregroundStyle(theme.textMuted)
                    }

                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("DATE").font(.system(size: 11, weight: .semibold)).tracking(0.6).foregroundStyle(theme.textMuted)
                            DatePicker("", selection: $date, displayedComponents: [.date, .hourAndMinute])
                                .labelsHidden()
                                .colorScheme(theme.textPrimary == .white ? .dark : .light)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        Text("NOTES").font(.system(size: 11, weight: .semibold)).tracking(0.6).foregroundStyle(theme.textMuted)
                        TextField("Optional · e.g. after morning walk", text: $notes)
                            .padding(12)
                            .background(theme.surface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 10, style: .continuous)
                                    .stroke(theme.borderStrong, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }

                    Button {
                        Task { await save() }
                    } label: {
                        Text(saving ? "Saving…" : "Save record")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(theme.primary)
                            .foregroundStyle(theme.onPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .disabled(saving)
                }
                .padding(20)
            }
        }
        .background(theme.surfaceElev)
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear {
            if let latest = weights.latest?.weight { weight = latest }
        }
    }

    private func save() async {
        guard !saving else { return }
        saving = true
        defer { saving = false }
        let req = CreateWeightRequest(petId: petId, weight: weight, timestamp: date, notes: notes.isEmpty ? nil : notes)
        if await weights.create(req) != nil { onDone() }
    }
}

// MARK: - Add pet sheet (used from screen 03)

struct AddPetSheet: View {
    @EnvironmentObject var pets: PetsStore
    @Environment(\.theme) private var theme
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var petType: PetType = .dog
    @State private var gender: PetGender = .unknown
    @State private var breed: String = ""
    @State private var weight: String = ""
    @State private var saving = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    field("Name", text: $name)
                    pickerRow("Type", selection: $petType, options: PetType.allCases.map { ($0, "\($0.emoji) \($0.displayName)") })
                    pickerRow("Gender", selection: $gender, options: PetGender.allCases.map { ($0, $0.displayName) })
                    field("Breed (optional)", text: $breed)
                    field("Current weight (kg, optional)", text: $weight)
                        .keyboardType(.decimalPad)
                }
                .padding(20)
            }
            .background(theme.bg)
            .navigationTitle("Add pet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button { Task { await save() } } label: {
                        if saving { ProgressView() } else { Text("Save").fontWeight(.semibold) }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty || saving)
                }
            }
        }
    }

    private func field(_ label: String, text: Binding<String>) -> some View {
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

    private func pickerRow<V: Hashable>(_ label: String, selection: Binding<V>, options: [(V, String)]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label.uppercased())
                .font(.system(size: 11, weight: .semibold))
                .tracking(0.6)
                .foregroundStyle(theme.textMuted)
            Picker("", selection: selection) {
                ForEach(options, id: \.0) { (v, t) in
                    Text(t).tag(v)
                }
            }
            .pickerStyle(.segmented)
        }
    }

    private func save() async {
        guard !saving else { return }
        saving = true
        defer { saving = false }
        let req = CreatePetRequest(
            name: name,
            petType: petType,
            gender: gender,
            breed: breed.isEmpty ? nil : breed,
            currentWeightKg: Double(weight),
            isSpayed: false
        )
        if await pets.create(req) != nil { dismiss() }
    }
}
