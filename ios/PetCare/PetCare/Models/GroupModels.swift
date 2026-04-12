import Foundation

struct PetGroup: Codable, Identifiable {
    let id: String
    let name: String
    let creatorId: String?
    let creatorName: String?
    let role: String?
    let memberCount: Int?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, role
        case creatorId = "creator_id"
        case creatorName = "creator_name"
        case memberCount = "member_count"
        case createdAt = "created_at"
    }
}

struct GroupMember: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let role: String
    let picture: String?
}

struct GroupPet: Codable, Identifiable {
    let id: String
    let name: String
    let ownerId: String?
    let ownerName: String?
    let permissionLevel: String?
    let photoUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, name
        case ownerId = "owner_id"
        case ownerName = "owner_name"
        case permissionLevel = "permission_level"
        case photoUrl = "photo_url"
    }
}

struct InvitationPreview: Codable {
    let groupName: String
    let inviterName: String
    let role: String
    let expirationDate: String?
    let invitationId: String?

    enum CodingKeys: String, CodingKey {
        case role
        case groupName = "group_name"
        case inviterName = "inviter_name"
        case expirationDate = "expiration_date"
        case invitationId = "invitation_id"
    }
}

struct InvitationResult: Codable {
    let inviteCode: String
    let expirationDate: String?

    enum CodingKeys: String, CodingKey {
        case inviteCode = "invite_code"
        case expirationDate = "expiration_date"
    }
}

struct CreateGroupRequest: Codable {
    let name: String
}

struct CreateInvitationRequest: Codable {
    let role: String
}

struct JoinGroupRequest: Codable {
    let inviteCode: String

    enum CodingKeys: String, CodingKey {
        case inviteCode = "invite_code"
    }
}
