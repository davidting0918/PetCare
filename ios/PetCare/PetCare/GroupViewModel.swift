// GroupsStore — cached-first list of groups the current user is in,
// plus membership / invitation flows.

import Foundation
import SwiftUI

@MainActor
final class GroupsStore: ObservableObject {
    @Published var groups: [GroupSummary] = []
    @Published var members: [String: [MemberSummary]] = [:]    // group_id → members
    @Published var lastError: String?
    @Published var loading: Bool = false

    func refresh() async {
        loading = groups.isEmpty
        defer { loading = false }
        do {
            groups = try await APIClient.shared.get("/group/my_groups")
        } catch let err as APIError {
            lastError = err.errorDescription
        } catch { lastError = error.localizedDescription }
    }

    func loadMembers(groupId: String) async {
        do {
            let list: [MemberSummary] = try await APIClient.shared.get(
                "/group/members", query: ["group_id": groupId])
            members[groupId] = list
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    @discardableResult
    func createGroup(name: String) async -> GroupSummary? {
        do {
            let g: GroupSummary = try await APIClient.shared.post(
                "/group/create", body: CreateGroupRequest(name: name))
            groups.append(g)
            return g
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func deleteGroup(_ id: String) async -> Bool {
        do {
            _ = try await APIClient.shared.post(
                "/group/delete",
                body: DeleteGroupRequest(groupId: id)) as EmptyResponse
            groups.removeAll { $0.id == id }
            return true
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return false
    }

    func createInvitation(groupId: String, role: GroupRole = .member) async -> InvitationCreated? {
        do {
            let inv: InvitationCreated = try await APIClient.shared.post(
                "/group/invitation/create",
                body: CreateInvitationRequest(groupId: groupId, role: role))
            return inv
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func previewInvitation(code: String) async -> InvitationPreview? {
        do {
            return try await APIClient.shared.get(
                "/group/invitation/preview", query: ["invite_code": code])
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    @discardableResult
    func joinByCode(_ code: String) async -> GroupSummary? {
        do {
            let g: GroupSummary = try await APIClient.shared.post(
                "/group/join",
                body: JoinGroupRequest(inviteCode: code))
            if !groups.contains(where: { $0.id == g.id }) { groups.append(g) }
            return g
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
        return nil
    }

    func updateMemberRole(groupId: String, userId: String, newRole: GroupRole) async {
        do {
            _ = try await APIClient.shared.post(
                "/group/member/update_role",
                body: UpdateMemberRoleRequest(groupId: groupId, userId: userId, newRole: newRole)) as EmptyResponse
            await loadMembers(groupId: groupId)
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }

    func removeMember(groupId: String, userId: String) async {
        do {
            _ = try await APIClient.shared.post(
                "/group/member/remove",
                body: RemoveMemberRequest(groupId: groupId, userId: userId)) as EmptyResponse
            members[groupId]?.removeAll { $0.userId == userId }
        } catch let err as APIError { lastError = err.errorDescription }
        catch { lastError = error.localizedDescription }
    }
}
