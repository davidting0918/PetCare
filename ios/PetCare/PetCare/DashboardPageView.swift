// Dashboard — screen 02. Greeting, pet selector, calorie ring, weight
// sparkline, upcoming meds, and recent meals.

import Charts
import SwiftUI

struct DashboardPageView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var pets: PetsStore
    @EnvironmentObject var meals: MealsStore
    @EnvironmentObject var weights: WeightsStore
    @EnvironmentObject var medicine: MedicineStore
    @Environment(\.theme) private var theme

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                header
                PetChipStrip(pets: pets)
                if let pet = pets.selectedPet {
                    calorieCard(petId: pet.id)
                    weightCard
                    upcomingCard
                    recentMealsCard
                } else {
                    emptyState
                }
                Spacer(minLength: 100)
            }
            .padding(.top, 8)
        }
        .background(theme.bg)
        .task(id: pets.selectedPetId) {
            guard let pet = pets.selectedPet else { return }
            async let m = meals.loadToday(petId: pet.id)
            async let w = weights.load(petId: pet.id)
            async let med = medicine.loadToday(petId: pet.id)
            _ = await (m, w, med)
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let part: String
        switch hour {
        case 5..<12:  part = "Good morning"
        case 12..<17: part = "Good afternoon"
        case 17..<22: part = "Good evening"
        default:      part = "Hello"
        }
        let name: String
        if case .authenticated(let u) = auth.state { name = u.name.components(separatedBy: " ").first ?? u.name }
        else { name = "" }
        return name.isEmpty ? part : "\(part), \(name)"
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(AppFormat.dayMonthYear(Date()))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(theme.textMuted)
                Text(greeting)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(theme.textPrimary)
            }
            Spacer()
            IconButton(icon: "bell") { /* TODO: notifications */ }
        }
        .padding(.horizontal, 20)
    }

    private var emptyState: some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 8) {
                Text("No pets yet")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("Add your first pet from the Pet tab to start tracking meals, weight and meds.")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.textSecondary)
            }
        }
        .padding(.horizontal, 20)
    }

    // MARK: Calorie card

    private func calorieCard(petId: String) -> some View {
        CardSurface {
            VStack(spacing: 16) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 6) {
                        SectionLabel(text: "Calories today")
                        if let today = meals.today, let target = today.dailyCalorieTarget {
                            HStack(alignment: .firstTextBaseline, spacing: 6) {
                                Text("\(Int(today.totalCalories))")
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundStyle(theme.textPrimary)
                                Text("/ \(target) kcal")
                                    .font(.system(size: 14))
                                    .foregroundStyle(theme.textMuted)
                            }
                            let remaining = max(0, Double(target) - today.totalCalories)
                            Text("\(remaining > 0 ? "On target · " : "")\(Int(remaining)) kcal left")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(theme.success)
                        } else {
                            Text("—")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundStyle(theme.textPrimary)
                            Text("No calorie target set on this pet.")
                                .font(.system(size: 12))
                                .foregroundStyle(theme.textMuted)
                        }
                    }
                    Spacer()
                    CalorieRing(
                        percent: ringPercent,
                        primary: theme.primary,
                        track: theme.border,
                        text: theme.textPrimary
                    )
                    .frame(width: 86, height: 86)
                }

                Divider().background(theme.border)

                HStack(alignment: .top, spacing: 14) {
                    macroCol("Protein", grams: meals.today?.meals.reduce(0) { $0 + $1.calories } ?? 0)  // placeholder until we have totals
                    // (We don't get a macro breakdown in TodayMealsResponse —
                    //  showing per-meal totals would require /meal/summary.
                    //  Keeping the placeholder slots for layout parity.)
                    macroCol("Logged", grams: Double(meals.today?.totalMeals ?? 0))
                    macroCol("Weight", grams: meals.today?.totalWeightG ?? 0)
                }
            }
        }
        .padding(.horizontal, 20)
    }

    private var ringPercent: Double {
        guard let today = meals.today, let target = today.dailyCalorieTarget, target > 0 else { return 0 }
        return min(1.0, today.totalCalories / Double(target))
    }

    private func macroCol(_ label: String, grams: Double) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(theme.textMuted)
            Text(formatNumber(grams))
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(theme.textPrimary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func formatNumber(_ v: Double) -> String {
        if v >= 100 { return "\(Int(v))" }
        return String(format: "%.1f", v)
    }

    // MARK: Weight card

    private var weightCard: some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        SectionLabel(text: "Weight trend · 30 days")
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            if let latest = weights.latest {
                                Text(String(format: "%.1f kg", latest.weight))
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(theme.textPrimary)
                            } else {
                                Text("—")
                                    .font(.system(size: 22, weight: .semibold))
                                    .foregroundStyle(theme.textPrimary)
                            }
                            if let delta = thirtyDayDelta {
                                let down = delta < 0
                                HStack(spacing: 2) {
                                    Image(systemName: down ? "arrow.down.right" : "arrow.up.right")
                                        .font(.system(size: 10, weight: .semibold))
                                    Text(String(format: "%@%.1f kg", down ? "" : "+", delta))
                                        .font(.system(size: 12, weight: .medium))
                                }
                                .foregroundStyle(down ? theme.success : theme.warning)
                            }
                        }
                    }
                    Spacer()
                    if let target = pets.selectedPet?.targetWeightKg {
                        Chip("Target \(String(format: "%.1f", target)) kg")
                    }
                }
                WeightSparkline(records: weights.records)
                    .frame(height: 80)
            }
        }
        .padding(.horizontal, 20)
    }

    private var thirtyDayDelta: Double? {
        guard let latest = weights.latest?.weight,
              let prior = weights.priorWeight(daysAgo: 30) else { return nil }
        return latest - prior
    }

    // MARK: Upcoming meds card

    private var upcomingCard: some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Upcoming")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(theme.textPrimary)
                    Spacer()
                }
                if let sched = medicine.todaySchedule,
                   !sched.scheduledItems.filter({ !$0.isDone }).isEmpty {
                    ForEach(sched.scheduledItems.filter { !$0.isDone }.prefix(3)) { item in
                        upcomingRow(item)
                    }
                } else {
                    Text("Nothing scheduled. Tap the Medicine tab to add a course.")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .padding(.horizontal, 20)
    }

    private func upcomingRow(_ item: ScheduledItem) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "pills.fill")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(theme.primary)
                .frame(width: 40, height: 40)
                .background(theme.primarySoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(item.medicationName)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("\(formatNumber(item.dosage)) \(item.dosageUnit.displayName.lowercased()) · \(item.timeOfDay.displayName.lowercased())")
                    .font(.system(size: 12))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            Text(item.timeOfDay.displayName)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(theme.warning)
        }
    }

    // MARK: Recent meals card

    private var recentMealsCard: some View {
        CardSurface {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("Recent meals")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(theme.textPrimary)
                    Spacer()
                }
                if let meals = meals.today?.meals, !meals.isEmpty {
                    ForEach(meals.prefix(3)) { m in
                        mealRow(m)
                    }
                } else {
                    Text("No meals logged yet today.")
                        .font(.system(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 24)
    }

    private func mealRow(_ m: MealSummary) -> some View {
        HStack(spacing: 12) {
            Text("🥩")
                .font(.system(size: 18))
                .frame(width: 40, height: 40)
                .background(theme.primarySoft)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text("\(m.foodBrand) \(m.foodProductName)")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text("\(m.mealType?.displayName ?? "Meal") · \(formatNumber(m.servingAmount)) \(m.servingType.displayName.lowercased())")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textSecondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(Int(m.calories)) kcal")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(theme.textPrimary)
                Text(AppFormat.time(m.timestamp))
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textMuted)
            }
        }
    }
}

// MARK: - Calorie ring (custom shape)

struct CalorieRing: View {
    let percent: Double
    let primary: Color
    let track: Color
    let text: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(track, lineWidth: 8)
            Circle()
                .trim(from: 0, to: percent)
                .stroke(primary, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text("\(Int(percent * 100))%")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(text)
        }
    }
}

// MARK: - Sparkline

struct WeightSparkline: View {
    let records: [WeightSummary]
    @Environment(\.theme) private var theme

    var body: some View {
        if records.count < 2 {
            HStack {
                Spacer()
                Text("Log a couple of weights to see the trend.")
                    .font(.system(size: 11))
                    .foregroundStyle(theme.textMuted)
                Spacer()
            }
        } else {
            Chart {
                ForEach(records.suffix(30)) { r in
                    LineMark(
                        x: .value("date", r.timestamp),
                        y: .value("kg", r.weight)
                    )
                    .foregroundStyle(theme.chart1)
                    .interpolationMethod(.monotone)
                    AreaMark(
                        x: .value("date", r.timestamp),
                        y: .value("kg", r.weight)
                    )
                    .foregroundStyle(theme.chart1.opacity(0.12))
                    .interpolationMethod(.monotone)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
        }
    }
}
