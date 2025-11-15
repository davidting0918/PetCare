// ===== User Types =====

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  picture?: string;
  personal_group_id?: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
  is_active?: boolean;
  is_verified?: boolean;
}


export interface UserInfo {
  id: string;
  email: string;
  name: string;
  picture: string;
  personal_group_id: string;
  created_at: string;  // 改為字符串格式 (ISO date string)
  updated_at: string;  // 改為字符串格式 (ISO date string)
  source: string;
  is_active: boolean;
  is_verified: boolean;
}

export type UserRole = 'Creator' | 'Member' | 'Viewer';

export interface CreateUserRequest {
  email: string;
  name: string;
  pwd: string;
}

export interface UpdateUserInfoRequest {
  name?: string;
  picture?: string;
}

export interface PhotoUploadResponse {
  photo_url: string;
  photo_name: string;
  photo_size: number;
  photo_type: string;
  photo_uploaded_at: number;
}
