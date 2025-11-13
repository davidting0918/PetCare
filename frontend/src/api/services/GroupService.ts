import { apiClient } from "../client";
import type { MyGroupResponse, GroupMemberInfo, ApiResponse, CreateGroupRequest } from "../../types";

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
}

export const groupService = new GroupService();
