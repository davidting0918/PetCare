import { apiClient } from "../client";
import type { MyGroupResponse, GroupMemberInfo, ApiResponse, CreateGroupRequest, GroupRole, JoinGroupRequest, GroupInfo } from "../../types";

interface CreateInvitationRequest {
    role: GroupRole;
}

interface InvitationResponse {
    id: string;
    group_name: string;
    invited_by_name: string;
    invite_code: string;
    created_at: string;
    expires_at: string;
    role: GroupRole;
}

class GroupService {
    private basePath = '/groups';

    async getMyGroups(): Promise<ApiResponse<MyGroupResponse[]>> {
        const response = await apiClient.get(`${this.basePath}/my_groups`);
        return response.data;
    }

    async getGroupMembers(groupId: string): Promise<ApiResponse<GroupMemberInfo[]>> {
        const response = await apiClient.get(`${this.basePath}/${groupId}/members`);
        return response.data;
    }

    async createGroup(request: CreateGroupRequest): Promise<ApiResponse<any>> {
        const response = await apiClient.post(`${this.basePath}/create`, request);
        return response.data;
    }

    async createInvitation(groupId: string, request: CreateInvitationRequest): Promise<ApiResponse<InvitationResponse>> {
        const response = await apiClient.post(`${this.basePath}/${groupId}/invite`, request);
        return response.data;
    }

    async deleteGroup(groupId: string): Promise<ApiResponse<any>> {
        const response = await apiClient.post(`${this.basePath}/delete/${groupId}`);
        return response.data;
    }

    async joinGroup(request: JoinGroupRequest): Promise<ApiResponse<GroupInfo>> {
        const response = await apiClient.post(`${this.basePath}/join`, request);
        return response.data;
    }
}

export const groupService = new GroupService();
