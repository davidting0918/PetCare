import Foundation

@Observable
final class GroupViewModel {
    var groups: [Group] = []
    var members: [String: [GroupMember]] = [:]
    var groupPets: [String: [GroupPet]] = [:]
    var isLoading = false
    var errorMessage: String?

    @MainActor
    func loadGroups() async {
        isLoading = true
        do {
            groups = try await APIClient.shared.fetchMyGroups()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    @MainActor
    func loadMembers(groupId: String) async {
        do {
            members[groupId] = try await APIClient.shared.fetchGroupMembers(groupId: groupId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func loadGroupPets(groupId: String) async {
        do {
            groupPets[groupId] = try await APIClient.shared.fetchGroupPets(groupId: groupId)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func createGroup(name: String) async throws -> Group {
        let group = try await APIClient.shared.createGroup(CreateGroupRequest(name: name))
        await loadGroups()
        return group
    }

    @MainActor
    func deleteGroup(groupId: String) async throws {
        try await APIClient.shared.deleteGroup(groupId: groupId)
        await loadGroups()
    }

    @MainActor
    func createInvitation(groupId: String, role: String) async throws -> InvitationResult {
        return try await APIClient.shared.createInvitation(groupId: groupId, role: role)
    }

    @MainActor
    func previewInvitation(inviteCode: String) async throws -> InvitationPreview {
        return try await APIClient.shared.previewInvitation(inviteCode: inviteCode)
    }

    @MainActor
    func joinGroup(inviteCode: String) async throws {
        _ = try await APIClient.shared.joinGroup(inviteCode: inviteCode)
        await loadGroups()
    }
}
