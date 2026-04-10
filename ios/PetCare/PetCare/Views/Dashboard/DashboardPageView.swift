import SwiftUI

struct DashboardPageView: View {
    var petSelector: PetSelectorViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Dashboard", petSelector: petSelector) {
                            await petSelector.refresh()
                        }

                        if let pet = petSelector.selectedPet {
                            PetSummaryCard(pet: pet, details: petSelector.selectedPetDetails)
                            QuickStatsGrid(details: petSelector.selectedPetDetails)
                        } else {
                            emptyState
                        }
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "pawprint.fill")
                .font(.system(size: 48))
                .foregroundStyle(Color.textTertiary)
            Text("No pets yet")
                .font(.headline)
                .foregroundStyle(Color.textSecondary)
            Text("Add a pet in Settings to get started")
                .font(.subheadline)
                .foregroundStyle(Color.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 80)
    }
}

struct PetSummaryCard: View {
    let pet: PetInfo
    let details: PetDetails?

    var body: some View {
        HStack(spacing: 16) {
            if let url = pet.photoUrl, let imageURL = URL(string: url) {
                AsyncImage(url: imageURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    ProgressView().tint(Color.accentTeal)
                }
                .frame(width: 72, height: 72)
                .clipShape(Circle())
            } else {
                Image(systemName: "pawprint.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(Color.accentTeal)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(pet.name)
                    .font(.title3).fontWeight(.bold)
                    .foregroundStyle(Color.textPrimary)
                if let breed = pet.breed {
                    Text(breed)
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
                HStack(spacing: 8) {
                    if let gender = pet.gender {
                        Label(gender.rawValue.capitalized, systemImage: gender == .male ? "circle.fill" : "circle.fill")
                            .font(.caption)
                            .foregroundStyle(Color.accentBlue)
                    }
                    Text(pet.petType.rawValue.capitalized)
                        .font(.caption)
                        .foregroundStyle(Color.textTertiary)
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

struct QuickStatsGrid: View {
    let details: PetDetails?

    var body: some View {
        HStack(spacing: 12) {
            StatCard(title: "Weight", value: details?.currentWeightKg.map { String(format: "%.1f kg", $0) } ?? "—", icon: "scalemass.fill", color: .accentTeal)
            StatCard(title: "Target", value: details?.targetWeightKg.map { String(format: "%.1f kg", $0) } ?? "—", icon: "target", color: .accentPurple)
            StatCard(title: "Cal/Day", value: details?.dailyCalorieTarget.map { "\($0)" } ?? "—", icon: "flame.fill", color: .accentPink)
        }
        .padding(.horizontal)
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(color)
            Text(value)
                .font(.headline).fontWeight(.bold)
                .foregroundStyle(Color.textPrimary)
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
