import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { GroupWithMembers, CreateGroupRequest } from '../../types';
import { groupService } from '../../api';
import { logout } from './authSlice';

interface GroupState {
    groups: GroupWithMembers[];
    isLoading: boolean;
    error: string | null;
}

const initialState: GroupState = {
    groups: [],
    isLoading: false,
    error: null,
};

// Async thunk to create a new group
export const createGroup = createAsyncThunk(
    'group/createGroup',
    async (request: CreateGroupRequest, { rejectWithValue }) => {
        try {
            const response = await groupService.createGroup(request);

            if (response.status !== 1 || !response.data) {
                throw new Error(response.message || 'Failed to create group');
            }

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create group');
        }
    }
);

// Async thunk to delete a group
export const deleteGroup = createAsyncThunk(
    'group/deleteGroup',
    async (groupId: string, { rejectWithValue }) => {
        try {
            const response = await groupService.deleteGroup(groupId);

            if (response.status !== 1 || !response.data) {
                throw new Error(response.message || 'Failed to delete group');
            }

            return groupId; // Return the groupId to remove it from state
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete group');
        }
    }
);

// Async thunk to fetch groups with their members
export const fetchMyGroupsWithMembers = createAsyncThunk(
    'group/fetchMyGroupsWithMembers',
    async (_, { rejectWithValue }) => {
        try {
            // Step 1: Fetch user's groups
            const myGroupsResponse = await groupService.getMyGroups();

            if (myGroupsResponse.status !== 1 || !myGroupsResponse.data) {
                throw new Error(myGroupsResponse.message || 'Failed to fetch groups');
            }

            const myGroups = myGroupsResponse.data;

            // Step 2: Fetch members for each group in parallel
            const groupsWithMembersPromises = myGroups.map(async (group) => {
                try {
                    const membersResponse = await groupService.getGroupMembers(group.group_id);

                    if (membersResponse.status !== 1 || !membersResponse.data) {
                        // If we can't get members, return group with empty members array
                        return {
                            id: group.group_id,
                            name: group.group_name,
                            memberCount: 1, // At least the user is a member
                            role: group.role,
                            members: [{
                                id: group.user_id,
                                name: group.user_name,
                                email: group.user_email,
                                role: group.role,
                            }],
                        };
                    }

                    // Convert members data to UI format
                    const members = membersResponse.data.map(member => ({
                        id: member.user_id,
                        name: member.user_name,
                        email: member.user_email,
                        role: member.role,
                    }));

                    return {
                        id: group.group_id,
                        name: group.group_name,
                        memberCount: members.length,
                        role: group.role,
                        members: members,
                    };
                } catch (error) {
                    // If fetching members fails for a specific group, return minimal data
                    return {
                        id: group.group_id,
                        name: group.group_name,
                        memberCount: 1,
                        role: group.role,
                        members: [{
                            id: group.user_id,
                            name: group.user_name,
                            email: group.user_email,
                            role: group.role,
                        }],
                    };
                }
            });

            const groupsWithMembers = await Promise.all(groupsWithMembersPromises);
            return groupsWithMembers;

        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch groups with members');
        }
    }
);

const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        clearGroupState: (state) => {
            state.groups = [];
            state.isLoading = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Handle createGroup
            .addCase(createGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createGroup.fulfilled, (state) => {
                state.isLoading = false;
                // Don't add the new group here, let fetchMyGroupsWithMembers handle it
            })
            .addCase(createGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Handle deleteGroup
            .addCase(deleteGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                // Remove the deleted group from the state
                state.groups = state.groups.filter(group => group.id !== action.payload);
            })
            .addCase(deleteGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Handle fetchMyGroupsWithMembers
            .addCase(fetchMyGroupsWithMembers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyGroupsWithMembers.fulfilled, (state, action) => {
                state.isLoading = false;
                state.groups = action.payload;
            })
            .addCase(fetchMyGroupsWithMembers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Handle logout from auth slice - clear group state
            .addCase(logout, (state) => {
                state.groups = [];
                state.isLoading = false;
                state.error = null;
            });
    }
});

export const { clearGroupState, clearError } = groupSlice.actions;
export default groupSlice.reducer;
