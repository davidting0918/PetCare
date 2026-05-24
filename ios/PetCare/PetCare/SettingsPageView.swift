// 11 Settings + 12 Invite sheet.

import SwiftUI

struct SettingsPageView: View {
    @EnvironmentObject var auth: AuthStore
    @EnvironmentObject var theme: ThemeManager
    @EnvironmentObject var groups: GroupsStore
    @EnvironmentObject var pets: PetsStore
    @Environment(\.theme) private var t

    @State private var inviteSheet: GroupSummary?
    @State private var membersOpen: GroupSummary?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ScreenHeader(title: "Settings") { EmptyView() }

                profileCard
                groupCard
                appearanceCard
                accountCard

                Text("PetCare iOS · Built with the Heracles pattern")
                    .font(.system(size: 11))
                    .foregroundStyle(t.textMuted)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 12)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 120)
        }
        .background(t.bg)
        .sheet(item: $inviteSheet) { group in
            InviteSheet(group: group)
        }
        .sheet(item: $membersOpen) { group in
            GroupMembersSheet(group: group)
        }
    }

    private var user: UserPublic? {
        if case .authenticated(let u) = auth.state { return u }
        return nil
    }

    private var profileCard: some View {
        HStack(spacing: 12) {
            ZStack {
                LinearGradient(colors: [t.primary, t.accent], startPoint: .topLeading, endPoint: .bottomTrailing)
                Text(initials)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(t.onPrimary)
            }
            .frame(width: 56, height: 56)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(user?.name ?? "—")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(t.textPrimary)
                Text(user?.email ?? "")
                    .font(.system(size: 12))
                    .foregroundStyle(t.textSecondary)
                Text("\(groups.groups.count) group\(groups.groups.count == 1 ? "" : "s") · \(pets.pets.count) pet\(pets.pets.count == 1 ? "" : "s")")
                    .font(.system(size: 11))
                    .foregroundStyle(t.textMuted)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(t.textMuted)
        }
        .padding(16)
        .background(t.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(t.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var initials: String {
        guard let name = user?.name else { return "—" }
        let parts = name.split(separator: " ")
        if parts.count >= 2 { return "\(parts.first!.prefix(1))\(parts.last!.prefix(1))".uppercased() }
        return String(name.prefix(2)).uppercased()
    }

    private var groupCard: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(groups.groups) { g in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(g.isPersonal ? "Personal group" : "Group")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(t.textMuted)
                        Text(g.name)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(t.textPrimary)
                        Text("\(g.memberCount) member\(g.memberCount == 1 ? "" : "s") · \(g.role.displayName)")
                            .font(.system(size: 12))
                            .foregroundStyle(t.textSecondary)
                    }
                    Spacer()
                    Menu {
                        Button("Invite") { inviteSheet = g }
                        Button("Members") { membersOpen = g }
                        if !g.isPersonal && g.role == .creator {
                            Button("Delete group", role: .destructive) {
                                Task { await groups.deleteGroup(g.id) }
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(t.textSecondary)
                            .frame(width: 28, height: 28)
                    }
                }
                .padding(.vertical, 12)
                if g.id != groups.groups.last?.id {
                    Divider().background(t.border)
                }
            }
            if groups.groups.isEmpty {
                Text("No groups yet.")
                    .font(.system(size: 12))
                    .foregroundStyle(t.textMuted)
                    .padding(.vertical, 16)
            }
        }
        .padding(.horizontal, 16)
        .background(t.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(t.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var appearanceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionLabel(text: "Appearance")
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(AppTheme.allCases) { ap in
                    themeSwatch(ap)
                }
            }
        }
        .padding(16)
        .background(t.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(t.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func themeSwatch(_ ap: AppTheme) -> some View {
        Button {
            theme.theme = ap
        } label: {
            VStack(spacing: 6) {
                ZStack(alignment: .bottomLeading) {
                    Rectangle().fill(ap.tokens.bg)
                    Circle().fill(ap.tokens.primary).frame(width: 12, height: 12)
                        .padding(6)
                }
                .frame(height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                Text(ap.displayName)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(ap == theme.theme ? t.primary : t.textPrimary)
            }
            .padding(8)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(ap == theme.theme ? t.primary : t.border, lineWidth: 1.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var accountCard: some View {
        VStack(spacing: 0) {
            settingsRow("bell", "Notifications", subtitle: "Managed in iOS Settings")
            Divider().background(t.border)
            settingsRow("lock", "Privacy & data", subtitle: nil)
            Divider().background(t.border)
            settingsRow("questionmark.circle", "Help & support", subtitle: nil)
            Divider().background(t.border)
            Button {
                Task { await auth.signOut() }
            } label: {
                settingsRow("rectangle.portrait.and.arrow.right", "Sign out", subtitle: nil, isAction: true)
            }
        }
        .padding(.horizontal, 16)
        .background(t.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(t.border, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func settingsRow(_ icon: String, _ label: String, subtitle: String?, isAction: Bool = false) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(isAction ? t.danger : t.textSecondary)
                .frame(width: 36, height: 36)
                .background(t.surfaceElev)
                .overlay(
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .stroke(t.border, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(isAction ? t.danger : t.textPrimary)
                if let sub = subtitle {
                    Text(sub)
                        .font(.system(size: 11))
                        .foregroundStyle(t.textSecondary)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(t.textMuted)
        }
        .padding(.vertical, 12)
    }
}

// MARK: - 12 Invite sheet

struct InviteSheet: View {
    let group: GroupSummary
    @EnvironmentObject var groups: GroupsStore
    @Environment(\.theme) private var t

    @State private var invite: InvitationCreated?
    @State private var loading = false
    @State private var role: GroupRole = .member

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Text("Invite to family group")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(t.textMuted)
                Text(group.name)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(t.textPrimary)

                // Code card
                VStack(spacing: 12) {
                    Text("INVITE CODE")
                        .font(.system(size: 11, weight: .semibold))
                        .tracking(0.6)
                        .foregroundStyle(t.textMuted)
                    if loading {
                        ProgressView().tint(t.primary).padding(.vertical, 12)
                    } else if let inv = invite {
                        Text(inv.inviteCode)
                            .font(.system(size: 32, weight: .bold, design: .monospaced))
                            .kerning(8)
                            .foregroundStyle(t.textPrimary)
                        Text("Expires \(AppFormat.relative(inv.expiresAt))")
                            .font(.system(size: 11))
                            .foregroundStyle(t.textMuted)
                    } else {
                        Text("Tap below to generate a code")
                            .font(.system(size: 13))
                            .foregroundStyle(t.textMuted)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(20)
                .background(t.surfaceElev)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .strokeBorder(t.borderStrong, style: StrokeStyle(lineWidth: 2, dash: [6]))
                )
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Picker("Role", selection: $role) {
                    ForEach([GroupRole.member, .viewer], id: \.self) { r in
                        Text(r.displayName).tag(r)
                    }
                }
                .pickerStyle(.segmented)

                HStack(spacing: 12) {
                    Button {
                        if let code = invite?.inviteCode {
                            UIPasteboard.general.string = code
                        }
                    } label: { actionButton("doc.on.doc", "Copy") }
                    .disabled(invite == nil)

                    Button { Task { await generate() } } label: {
                        actionButton("arrow.clockwise", "New code")
                    }
                }

                if let share = invite?.shareMessage {
                    Text(share)
                        .font(.system(size: 12))
                        .foregroundStyle(t.textSecondary)
                        .padding(12)
                        .background(t.primarySoft)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Spacer()
            }
            .padding(20)
            .background(t.bg)
            .navigationTitle("Invite")
            .navigationBarTitleDisplayMode(.inline)
            .task { await generate() }
        }
    }

    private func actionButton(_ icon: String, _ label: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
            Text(label).font(.system(size: 13, weight: .semibold))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .foregroundStyle(t.textPrimary)
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(t.borderStrong, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func generate() async {
        loading = true; defer { loading = false }
        invite = await groups.createInvitation(groupId: group.id, role: role)
    }
}

// MARK: - Members sheet (lightweight roster + role management)

struct GroupMembersSheet: View {
    let group: GroupSummary
    @EnvironmentObject var groups: GroupsStore
    @Environment(\.theme) private var t

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(groups.members[group.id] ?? []) { m in
                        HStack(spacing: 12) {
                            Text(String(m.name.prefix(2)).uppercased())
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(t.textSecondary)
                                .frame(width: 36, height: 36)
                                .background(t.surfaceElev)
                                .clipShape(Circle())
                            VStack(alignment: .leading, spacing: 2) {
                                Text(m.name).font(.system(size: 14, weight: .semibold)).foregroundStyle(t.textPrimary)
                                Text(m.email).font(.system(size: 11)).foregroundStyle(t.textSecondary)
                            }
                            Spacer()
                            if group.role == .creator && m.role != .creator {
                                Menu {
                                    Button("Make member") {
                                        Task { await groups.updateMemberRole(groupId: group.id, userId: m.userId, newRole: .member) }
                                    }
                                    Button("Make viewer") {
                                        Task { await groups.updateMemberRole(groupId: group.id, userId: m.userId, newRole: .viewer) }
                                    }
                                    Button("Remove", role: .destructive) {
                                        Task { await groups.removeMember(groupId: group.id, userId: m.userId) }
                                    }
                                } label: {
                                    Pill(label: m.role.displayName, color: t.textSecondary, bg: t.surfaceElev)
                                }
                            } else {
                                Pill(label: m.role.displayName, color: t.textSecondary, bg: t.surfaceElev)
                            }
                        }
                        .padding(.vertical, 12)
                        Divider().background(t.border)
                    }
                }
                .padding(.horizontal, 20)
            }
            .background(t.bg)
            .navigationTitle(group.name)
            .navigationBarTitleDisplayMode(.inline)
            .task { await groups.loadMembers(groupId: group.id) }
        }
    }
}
