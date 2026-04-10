import SwiftUI

struct SettingsPageView: View {
    var authViewModel: AuthViewModel
    var petSelector: PetSelectorViewModel
    @State private var groupVM = GroupViewModel()
    @State private var petVM = PetViewModel()
    @State private var showCreatePet = false
    @State private var showCreateGroup = false
    @State private var showJoinGroup = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        HeaderView(title: "Settings", petSelector: petSelector)

                        // User profile
                        if let user = authViewModel.user {
                            UserProfileCard(user: user)
                        }

                        // My Pets
                        MyPetsSection(pets: petSelector.pets, onCreatePet: { showCreatePet = true })

                        // Groups
                        GroupsSection(groupVM: groupVM, onCreateGroup: { showCreateGroup = true }, onJoinGroup: { showJoinGroup = true })

                        // Actions
                        VStack(spacing: 12) {
                            Button { authViewModel.logout() } label: {
                                HStack {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                    Text("Sign Out")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Color.danger.opacity(0.15))
                                .foregroundStyle(Color.danger)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 40)
                    }
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $showCreatePet) {
                CreatePetSheet(petSelector: petSelector)
            }
            .sheet(isPresented: $showCreateGroup) {
                CreateGroupSheet(groupVM: groupVM)
            }
            .sheet(isPresented: $showJoinGroup) {
                JoinGroupSheet(groupVM: groupVM)
            }
            .task { await groupVM.loadGroups() }
        }
    }
}

// MARK: - User Profile

struct UserProfileCard: View {
    let user: User

    var body: some View {
        HStack(spacing: 16) {
            if let pic = user.picture, let url = URL(string: pic) {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFill()
                } placeholder: { ProgressView() }
                .frame(width: 56, height: 56).clipShape(Circle())
            } else {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 48)).foregroundStyle(Color.accentTeal)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Text(user.email)
                    .font(.subheadline).foregroundStyle(Color.textSecondary)
            }
            Spacer()
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

// MARK: - My Pets

struct MyPetsSection: View {
    let pets: [PetInfo]
    var onCreatePet: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("My Pets")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onCreatePet() } label: {
                    Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            ForEach(pets) { pet in
                HStack(spacing: 12) {
                    if let url = pet.photoUrl, let imageURL = URL(string: url) {
                        AsyncImage(url: imageURL) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Image(systemName: "pawprint.fill").foregroundStyle(Color.accentTeal)
                        }
                        .frame(width: 44, height: 44).clipShape(Circle())
                    } else {
                        Image(systemName: "pawprint.fill")
                            .foregroundStyle(Color.accentTeal)
                            .frame(width: 44, height: 44)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pet.name).font(.subheadline).fontWeight(.medium).foregroundStyle(Color.textPrimary)
                        HStack(spacing: 4) {
                            if let breed = pet.breed { Text(breed).font(.caption).foregroundStyle(Color.textSecondary) }
                            if let gn = pet.groupName {
                                Text(gn).font(.caption2).padding(.horizontal, 6).padding(.vertical, 1)
                                    .background(Color.accentBlue.opacity(0.15)).foregroundStyle(Color.accentBlue)
                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                            }
                        }
                    }
                    Spacer()
                }
                .padding()
                .background(Color.surface1)
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal)
            }
        }
    }
}

// MARK: - Groups

struct GroupsSection: View {
    var groupVM: GroupViewModel
    var onCreateGroup: () -> Void
    var onJoinGroup: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Groups")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onJoinGroup() } label: {
                    Text("Join").font(.subheadline).foregroundStyle(Color.accentTeal)
                }
                Button { onCreateGroup() } label: {
                    Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            if groupVM.groups.isEmpty {
                Text("No groups yet").foregroundStyle(Color.textTertiary)
                    .frame(maxWidth: .infinity).padding()
            } else {
                ForEach(groupVM.groups) { group in
                    GroupRow(group: group)
                }
            }
        }
    }
}

struct GroupRow: View {
    let group: Group

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(group.name)
                    .font(.subheadline).fontWeight(.medium).foregroundStyle(Color.textPrimary)
                HStack(spacing: 6) {
                    if let role = group.role {
                        Text(role.capitalized)
                            .font(.caption2).fontWeight(.semibold)
                            .padding(.horizontal, 6).padding(.vertical, 2)
                            .background(roleColor(role).opacity(0.15))
                            .foregroundStyle(roleColor(role))
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                    }
                    if let count = group.memberCount {
                        HStack(spacing: 2) {
                            Image(systemName: "person.2.fill").font(.caption2)
                            Text("\(count)").font(.caption)
                        }
                        .foregroundStyle(Color.textTertiary)
                    }
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
    }

    private func roleColor(_ role: String) -> Color {
        switch role {
        case "creator": return .accentPink
        case "member": return .accentTeal
        default: return .accentBlue
        }
    }
}

// MARK: - Create / Join Sheets

struct CreatePetSheet: View {
    var petSelector: PetSelectorViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var petType: PetType = .dog
    @State private var breed = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Pet Info") {
                        TextField("Name", text: $name)
                        Picker("Type", selection: $petType) {
                            ForEach(PetType.allCases, id: \.self) { Text($0.rawValue.capitalized) }
                        }
                        TextField("Breed (optional)", text: $breed)
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("New Pet").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            let req = CreatePetRequest(name: name, petType: petType, breed: breed.isEmpty ? nil : breed, gender: nil, birthDate: nil, currentWeightKg: nil, targetWeightKg: nil, dailyCalorieTarget: nil, notes: nil)
                            _ = try? await APIClient.shared.createPet(req)
                            await petSelector.loadPets()
                            dismiss()
                        }
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

struct CreateGroupSheet: View {
    var groupVM: GroupViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form { Section("Group Name") { TextField("Name", text: $name) } }
                    .scrollContentBackground(.hidden)
            }
            .navigationTitle("New Group").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task { _ = try? await groupVM.createGroup(name: name); dismiss() }
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

struct JoinGroupSheet: View {
    var groupVM: GroupViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var inviteCode = ""
    @State private var preview: InvitationPreview?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.surface0.ignoresSafeArea()
                Form {
                    Section("Invite Code") {
                        TextField("Enter code", text: $inviteCode)
                    }
                    if let p = preview {
                        Section("Preview") {
                            Text("Group: \(p.groupName)")
                            Text("Invited by: \(p.inviterName)")
                            Text("Role: \(p.role)")
                            Button("Join Group") {
                                Task { try? await groupVM.joinGroup(inviteCode: inviteCode); dismiss() }
                            }
                            .foregroundStyle(Color.accentTeal)
                        }
                    }
                    if let error = errorMessage {
                        Section { Text(error).foregroundStyle(Color.danger) }
                    }
                }
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Join Group").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Look Up") {
                        Task {
                            do { preview = try await groupVM.previewInvitation(inviteCode: inviteCode) }
                            catch { errorMessage = error.localizedDescription }
                        }
                    }
                    .disabled(inviteCode.isEmpty)
                }
            }
        }
    }
}
