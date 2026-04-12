import SwiftUI

struct HeaderView: View {
    let title: String
    var dataStore: DataStore
    var onRefresh: (() async -> Void)?
    @State private var showPetPicker = false
    @State private var isRefreshing = false

    var body: some View {
        HStack {
            Text(title)
                .font(.title2).fontWeight(.bold)
                .foregroundStyle(Color.textPrimary)

            Spacer()

            if let onRefresh {
                Button {
                    Task {
                        isRefreshing = true
                        await onRefresh()
                        isRefreshing = false
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                        .foregroundStyle(Color.textSecondary)
                        .rotationEffect(.degrees(isRefreshing ? 360 : 0))
                        .animation(isRefreshing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: isRefreshing)
                }
            }

            if dataStore.pets.count > 1 {
                Button { showPetPicker = true } label: {
                    HStack(spacing: 4) {
                        Text(dataStore.selectedPet?.name ?? "Select Pet")
                            .font(.subheadline).fontWeight(.medium)
                            .lineLimit(1)
                            .foregroundStyle(Color.textPrimary)
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.surface2)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .sheet(isPresented: $showPetPicker) {
                    PetPickerSheet(dataStore: dataStore, isPresented: $showPetPicker)
                        .presentationDetents([.medium])
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color.surface1)
    }
}

struct PetPickerSheet: View {
    var dataStore: DataStore
    @Binding var isPresented: Bool

    var body: some View {
        NavigationStack {
            List(dataStore.pets) { pet in
                Button {
                    Task { await dataStore.switchPet(pet) }
                    isPresented = false
                } label: {
                    HStack {
                        if let url = pet.photoUrl, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Image(systemName: "pawprint.fill").foregroundStyle(Color.accentTeal)
                            }
                            .frame(width: 40, height: 40)
                            .clipShape(Circle())
                        } else {
                            Image(systemName: "pawprint.fill")
                                .frame(width: 40, height: 40)
                                .foregroundStyle(Color.accentTeal)
                        }

                        VStack(alignment: .leading) {
                            Text(pet.name)
                                .fontWeight(.medium)
                                .foregroundStyle(Color.textPrimary)
                            if let breed = pet.breed {
                                Text(breed)
                                    .font(.caption)
                                    .foregroundStyle(Color.textSecondary)
                            }
                        }
                        Spacer()
                        if pet.id == dataStore.selectedPet?.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(Color.accentPink)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.surface0)
            .navigationTitle("Select Pet")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
