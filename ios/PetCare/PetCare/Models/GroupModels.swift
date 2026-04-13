import Foundation

struct PetGroup: Codable, Identifiable {
    var id: String { groupId }
    let groupId: String
    let groupName: String
    let role: String?
    let userId: String?
    let userName: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case role
        case groupId = "group_id"
        case groupName = "group_name"
        case userId = "user_id"
        case userName = "user_name"
        case createdAt = "created_at"
    }

    var name: String { groupName }
}

struct GroupMember: Codable, Identifiable {
    var id: String { userId }
    let userId: String
    let userName: String
    let userEmail: String
    let role: String
    let userPicture: String?

    enum CodingKeys: String, CodingKey {
        case role
        case userId = "user_id"
        case userName = "user_name"
        case userEmail = "user_email"
        case userPicture = "user_picture"
    }

    var name: String { userName }
    var email: String { userEmail }
    var picture: String? { userPicture }
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
