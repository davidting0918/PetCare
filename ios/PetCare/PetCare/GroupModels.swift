// Group DTOs — mirror backend/models/group.py.

import Foundation

enum GroupRole: String, Codable {
    case creator, member, viewer

    var displayName: String {
        switch self {
        case .creator: return "Creator"
        case .member:  return "Member"
        case .viewer:  return "Viewer"
        }
    }
}

enum InvitationStatus: String, Codable {
    case pending, accepted, expired
}

struct GroupSummary: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let creatorId: String
    let memberCount: Int
    let role: GroupRole
    let isPersonal: Bool
    let createdAt: Date
    let updatedAt: Date
}

struct MemberSummary: Codable, Identifiable, Equatable {
    var id: String { userId }
    let userId: String
    let name: String
    let email: String
    let picture: String?
    let role: GroupRole
    let invitedBy: String?
    let invitedByName: String?
    let joinedAt: Date
}

struct InvitationPreview: Codable, Equatable {
    let id: String
    let groupId: String
    let groupName: String
    let invitedByName: String
    let inviteCode: String
    let role: GroupRole
    let expiresAt: Date
    let createdAt: Date
}

struct InvitationCreated: Codable, Equatable {
    let id: String
    let groupId: String
    let groupName: String
    let inviteCode: String
    let role: GroupRole
    let expiresAt: Date
    let shareMessage: String
}

struct GroupPet: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let petType: String
    let breed: String?
    let gender: String
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let dailyCalorieTarget: Int?
    let photoUrl: String?
    let ownerId: String
    let ownerName: String
    let userPermission: String
    let createdAt: Date
    let updatedAt: Date
}

// ── Requests ──

struct CreateGroupRequest: Codable { let name: String }
struct DeleteGroupRequest: Codable { let groupId: String }
struct CreateInvitationRequest: Codable { let groupId: String; let role: GroupRole }
struct JoinGroupRequest: Codable { let inviteCode: String }
struct UpdateMemberRoleRequest: Codable { let groupId: String; let userId: String; let newRole: GroupRole }
struct RemoveMemberRequest: Codable { let groupId: String; let userId: String }
