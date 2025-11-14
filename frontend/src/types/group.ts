export type GroupRole = 'creator' | 'member' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export interface Group {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
}


export interface GroupMember {
    group_id: string;
    user_id: string;
    role: GroupRole;
    created_at: string;
    updated_at: string;
    invited_by: string | null;
    is_active: boolean;
}

export interface GroupInvitation {
    id: string;
    group_id: string;
    invited_by: string;
    invite_code: string;
    role: GroupRole;
    status: InvitationStatus;
    created_at: string;
    expires_at: string;
    accepted_by: string | null;
}

export interface CreateGroupRequest {
    name: string;
}

export interface JoinGroupRequest {
    invite_code: string;
}

// API Response from /groups/join
export interface GroupInfo {
    id: string;
    name: string;
    creator_id: string;
    created_at: string;
    updated_at: string;
    member_count: number;
    is_creator: boolean;
    is_active: boolean;
}

// API Response from /groups/my_groups
export interface MyGroupResponse {
    group_id: string;
    group_name: string;
    user_id: string;
    user_name: string;
    user_email: string;
    role: GroupRole;
    created_at: string;
    invited_by: string | null;
    invited_by_name: string | null;
    is_active: boolean;
}

// API Response from /groups/{group_id}/members
export interface GroupMemberInfo {
    group_id: string;
    group_name: string;
    user_id: string;
    user_name: string;
    user_email: string;
    role: GroupRole;
    created_at: string;
    invited_by: string | null;
    invited_by_name: string | null;
    is_active: boolean;
}

// Combined data for UI usage
export interface GroupWithMembers {
    id: string;
    name: string;
    memberCount: number;
    role: GroupRole;
    members: {
        id: string;
        name: string;
        email: string;
        role: GroupRole;
    }[];
}
