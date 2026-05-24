// Reusable "pet chip" strip — used at the top of Dashboard / Pet List
// to let the user switch which pet they're currently viewing.

import SwiftUI

struct PetChipStrip: View {
    @ObservedObject var pets: PetsStore
    var onAddTapped: (() -> Void)? = nil
    @Environment(\.theme) private var theme

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(pets.pets) { pet in
                    Button { pets.select(pet.id) } label: {
                        PetChip(
                            name: pet.name,
                            emoji: pet.petType.emoji,
                            active: pets.selectedPetId == pet.id
                        )
                    }
                    .buttonStyle(.plain)
                }
                if let onAddTapped = onAddTapped {
                    Button(action: onAddTapped) {
                        HStack(spacing: 6) {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .semibold))
                            Text("Add")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(theme.surface)
                        .foregroundStyle(theme.textSecondary)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(theme.border, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 20).padding(.vertical, 4)
        }
    }
}

struct PetChip: View {
    let name: String
    let emoji: String
    let active: Bool
    @Environment(\.theme) private var theme

    var body: some View {
        HStack(spacing: 6) {
            Text(emoji)
                .font(.system(size: 14))
                .frame(width: 22, height: 22)
                .background(theme.surfaceElev)
                .clipShape(Circle())
            Text(name)
                .font(.system(size: 12, weight: .semibold))
        }
        .padding(.leading, 6).padding(.trailing, 12).padding(.vertical, 6)
        .background(active ? theme.primarySoft : theme.surface)
        .foregroundStyle(active ? theme.primary : theme.textSecondary)
        .clipShape(Capsule())
        .overlay(
            Capsule().stroke(active ? Color.clear : theme.border, lineWidth: 1)
        )
    }
}
