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
  created_at: Date;
  updated_at: Date;
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
