import SwiftUI

// MARK: - Groups Section (used in Settings)

struct GroupsSection: View {
    var dataStore: DataStore
    var onCreateGroup: () -> Void
    var onJoinGroup: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Groups")
                    .font(.headline).foregroundStyle(Color.textPrimary)
                Spacer()
                Button { onJoinGroup() } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "ticket").font(.caption)
                        Text("Join").font(.subheadline)
                    }
                    .foregroundStyle(Color.accentTeal)
                }
                Button { onCreateGroup() } label: {
                    Image(systemName: "plus.circle.fill").foregroundStyle(Color.accentPink)
                }
            }
            .padding(.horizontal)

            if dataStore.groups.isEmpty {
                VStack(spacing: 8) {
                    Image(systemName: "person.3").font(.title2).foregroundStyle(Color.textTertiary)
                    Text("No groups yet").foregroundStyle(Color.textTertiary)
                    Text("Create or join a group to share pet care").font(.caption).foregroundStyle(Color.textDisabled)
                }
                .frame(maxWidth: .infinity).padding()
            } else {
                ForEach(dataStore.groups) { group in
                    ExpandableGroupCard(group: group, dataStore: dataStore)
                }
            }
        }
    }
}

// MARK: - Expandable Group Card

struct ExpandableGroupCard: View {
    let group: PetGroup
    var dataStore: DataStore
    @State private var isExpanded = false
    @State private var selectedTab = 0 // 0 = Members, 1 = Pets
    @State private var members: [GroupMember] = []
    @State private var groupPets: [GroupPet] = []
    @State private var showInvite = false
    @State private var showDeleteConfirm = false
    @State private var isLoadingDetails = false

    var isCreator: Bool { group.role == "creator" }
    var canInvite: Bool { group.role == "creator" || group.role == "member" }

    var body: some View {
        VStack(spacing: 0) {
            // Header (tappable)
            Button { withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() } } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(group.name)
                            .font(.subheadline).fontWeight(.semibold).foregroundStyle(Color.textPrimary)
                        HStack(spacing: 6) {
                            if let role = group.role {
                                RoleBadge(role: role)
                            }
                            Text("\(members.count) members")
                                .font(.caption).foregroundStyle(Color.textTertiary)
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption).foregroundStyle(Color.textTertiary)
                }
            }
            .padding()

            // Expanded content
            if isExpanded {
                Divider().background(Color.borderSubtle)

                // Tab bar
                HStack(spacing: 0) {
                    TabButton(title: "Members", isActive: selectedTab == 0) { selectedTab = 0 }
                    TabButton(title: "Pets", isActive: selectedTab == 1) { selectedTab = 1 }
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Tab content
                if isLoadingDetails {
                    ProgressView().tint(Color.accentTeal).padding()
                } else if selectedTab == 0 {
                    MembersTab(members: members)
                } else {
                    PetsTab(pets: groupPets)
                }

                // Actions
                HStack(spacing: 12) {
                    if canInvite {
                        Button { showInvite = true } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "person.badge.plus").font(.caption)
                                Text("Invite")
                            }
                            .font(.subheadline)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Color.accentTeal.opacity(0.15))
                            .foregroundStyle(Color.accentTeal)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    if isCreator {
                        Button { showDeleteConfirm = true } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "trash").font(.caption)
                                Text("Delete")
                            }
                            .font(.subheadline)
                            .padding(.horizontal, 12).padding(.vertical, 8)
                            .background(Color.danger.opacity(0.15))
                            .foregroundStyle(Color.danger)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                    Spacer()
                }
                .padding(.horizontal).padding(.bottom, 12)
            }
        }
        .background(Color.surface1)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
        .onChange(of: isExpanded) { _, expanded in
            if expanded { loadDetails() }
        }
        .sheet(isPresented: $showInvite) {
            InviteSheet(groupId: group.groupId)
                .presentationDetents([.medium])
                .presentationDragIndicator(.visible)
        }
        .confirmationDialog("Delete \(group.name)?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task {
                    try? await APIClient.shared.deleteGroup(groupId: group.groupId)
                    await dataStore.refreshGroups()
                }
            }
        } message: {
            Text("This will permanently delete the group and remove all members.")
        }
    }

    private func loadDetails() {
        isLoadingDetails = true
        Task {
            do {
                members = try await APIClient.shared.fetchGroupMembers(groupId: group.groupId)
                groupPets = try await APIClient.shared.fetchGroupPets(groupId: group.groupId)
            } catch {
                #if DEBUG
                print("Load group details failed: \(error)")
                #endif
            }
            isLoadingDetails = false
        }
    }
}

// MARK: - Tabs

struct TabButton: View {
    let title: String
    let isActive: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline).fontWeight(isActive ? .semibold : .regular)
                .foregroundStyle(isActive ? Color.accentPink : Color.textTertiary)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .overlay(alignment: .bottom) {
                    if isActive {
                        Rectangle().fill(Color.accentPink).frame(height: 2)
                    }
                }
        }
    }
}

struct MembersTab: View {
    let members: [GroupMember]

    var body: some View {
        VStack(spacing: 8) {
            ForEach(members) { member in
                HStack(spacing: 10) {
                    if let pic = member.picture, let url = URL(string: pic) {
                        AsyncImage(url: url) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Image(systemName: "person.circle.fill").foregroundStyle(Color.accentTeal)
                        }
                        .frame(width: 32, height: 32).clipShape(Circle())
                    } else {
                        Image(systemName: "person.circle.fill")
                            .font(.title3).foregroundStyle(Color.accentTeal)
                    }
                    VStack(alignment: .leading, spacing: 1) {
                        Text(member.name).font(.subheadline).foregroundStyle(Color.textPrimary)
                        Text(member.email).font(.caption2).foregroundStyle(Color.textTertiary)
                    }
                    Spacer()
                    RoleBadge(role: member.role)
                }
            }
        }
        .padding(.horizontal).padding(.vertical, 8)
    }
}

struct PetsTab: View {
    let pets: [GroupPet]

    var body: some View {
        if pets.isEmpty {
            Text("No pets in this group").font(.caption).foregroundStyle(Color.textTertiary).padding()
        } else {
            VStack(spacing: 8) {
                ForEach(pets) { pet in
                    HStack(spacing: 10) {
                        if let url = pet.photoUrl, let imageURL = URL(string: url) {
                            AsyncImage(url: imageURL) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Image(systemName: "pawprint.fill").foregroundStyle(Color.accentTeal)
                            }
                            .frame(width: 32, height: 32).clipShape(Circle())
                        } else {
                            Image(systemName: "pawprint.fill")
                                .font(.title3).foregroundStyle(Color.accentTeal)
                        }
                        VStack(alignment: .leading, spacing: 1) {
                            Text(pet.name).font(.subheadline).foregroundStyle(Color.textPrimary)
                            if let owner = pet.ownerName {
                                Text("Owner: \(owner)").font(.caption2).foregroundStyle(Color.textTertiary)
                            }
                        }
                        Spacer()
                    }
                }
            }
            .padding(.horizontal).padding(.vertical, 8)
        }
    }
}

// MARK: - Shared

struct RoleBadge: View {
    let role: String

    var body: some View {
        Text(role.capitalized)
            .font(.caption2).fontWeight(.semibold)
            .padding(.horizontal, 6).padding(.vertical, 2)
            .background(color.opacity(0.15))
            .foregroundStyle(color)
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private var color: Color {
        switch role {
        case "creator": return .accentPink
        case "member": return .accentTeal
        default: return .accentBlue
        }
    }
}

// MARK: - Invite Sheet

struct InviteSheet: View {
    let groupId: String
    @Environment(\.dismiss) private var dismiss
    @State private var role = "member"
    @State private var inviteCode: String?
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Invite Role") {
                    Picker("Role", selection: $role) {
                        Text("Member").tag("member")
                        Text("Viewer").tag("viewer")
                    }
                    .pickerStyle(.segmented)
                }

                if let code = inviteCode {
                    Section("Invite Code") {
                        HStack {
                            Text(code).font(.system(.body, design: .monospaced))
                            Spacer()
                            Button {
                                UIPasteboard.general.string = code
                            } label: {
                                Image(systemName: "doc.on.doc").foregroundStyle(Color.accentTeal)
                            }
                        }
                        Text("Share this code with the person you want to invite")
                            .font(.caption).foregroundStyle(Color.textTertiary)
                    }
                }

                if let error = errorMessage {
                    Section { Text(error).foregroundStyle(Color.danger) }
                }
            }
            .navigationTitle("Invite Member").navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() } }
                if inviteCode == nil {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Create Invite") {
                            isCreating = true
                            Task {
                                do {
                                    let result = try await APIClient.shared.createInvitation(groupId: groupId, role: role)
                                    inviteCode = result.inviteCode
                                } catch {
                                    errorMessage = error.localizedDescription
                                }
                                isCreating = false
                            }
                        }
                        .disabled(isCreating)
                    }
                }
            }
        }
    }
}
