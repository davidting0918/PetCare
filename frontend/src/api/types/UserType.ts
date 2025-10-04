export interface CreateUserRequest {
    email: string;
    name: string;
    pwd: string;
}

export interface UserInfo {
    id: string
    email: string
    name: string
    picture: string
    personal_group_id: string
    created_at: Date
    updated_at: Date
    source: string
    is_active: boolean
    is_verified: boolean
}
