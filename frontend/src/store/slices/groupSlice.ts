import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { GroupWithMembers, CreateGroupRequest, JoinGroupRequest, GroupPetInfo, FetchGroupsWithMembersResult } from '../../types';
import { groupService } from '../../api';
import { logout } from './authSlice';

interface GroupState {
    groups: GroupWithMembers[] | null;
    groupPets: Record<string, GroupPetInfo[]>; // groupId -> pets mapping
    isLoading: boolean;
    isLoadingPets: Record<string, boolean>; // per-group loading state for pets
    error: string | null;
    petsError: Record<string, string>; // per-group error messages for pets
}

const initialState: GroupState = {
    groups: null,
    groupPets: {},
    isLoading: false,
    isLoadingPets: {},
    error: null,
    petsError: {},
};

// Async thunk to create a new group
export const createGroup = createAsyncThunk<
    any,
    CreateGroupRequest,
    { rejectValue: string }
>(
    'group/createGroup',
    async (request, { rejectWithValue }) => {
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
export const deleteGroup = createAsyncThunk<
    string,
    string,
    { rejectValue: string }
>(
    'group/deleteGroup',
    async (groupId, { rejectWithValue }) => {
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

// Async thunk to join a group using invitation code
export const joinGroup = createAsyncThunk<
    any,
    JoinGroupRequest,
    { rejectValue: string }
>(
    'group/joinGroup',
    async (request, { rejectWithValue, dispatch }) => {
        try {
            const response = await groupService.joinGroup(request);

            if (response.status !== 1 || !response.data) {
                throw new Error(response.message || 'Failed to join group');
            }

            // After successfully joining, refresh the groups list
            await dispatch(fetchMyGroupsWithMembers());

            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to join group');
        }
    }
);

// Async thunk to fetch groups with their members AND pets
export const fetchMyGroupsWithMembers = createAsyncThunk<
    FetchGroupsWithMembersResult,
    void,
    { rejectValue: string }
>(
    'group/fetchMyGroupsWithMembers',
    async (_, { rejectWithValue }) => {
        try {
            // Step 1: Fetch user's groups
            const myGroupsResponse = await groupService.getMyGroups();

            if (myGroupsResponse.status !== 1 || !myGroupsResponse.data) {
                throw new Error(myGroupsResponse.message || 'Failed to fetch groups');
            }

            const myGroups = myGroupsResponse.data;

            // Step 2: Fetch members AND pets for each group in parallel
            const groupsDataPromises = myGroups.map(async (group) => {
                try {
                    // Fetch members and pets in parallel
                    const [membersResponse, petsResponse] = await Promise.all([
                        groupService.getGroupMembers(group.group_id),
                        groupService.getGroupPets(group.group_id)
                    ]);

                    // Process members
                    let members: GroupWithMembers['members'] = [{
                        id: group.user_id,
                        name: group.user_name,
                        email: group.user_email,
                        role: group.role,
                        picture: group.user_picture,
                    }];

                    if (membersResponse.status === 1 && membersResponse.data) {
                        members = membersResponse.data.map(member => ({
                            id: member.user_id,
                            name: member.user_name,
                            email: member.user_email,
                            role: member.role,
                            picture: member.user_picture,
                        }));
                    }

                    // Process pets
                    let pets: GroupPetInfo[] = [];
                    if (petsResponse.status === 1 && petsResponse.data) {
                        pets = petsResponse.data;
                    }

                    const groupWithMembers: GroupWithMembers = {
                        id: group.group_id,
                        name: group.group_name,
                        memberCount: members.length,
                        role: group.role,
                        members: members,
                    };

                    return {
                        group: groupWithMembers,
                        pets: pets,
                        groupId: group.group_id,
                    };
                } catch (error) {
                    console.error(`Failed to fetch data for group ${group.group_id}:`, error);
                    // Return minimal data on error
                    const fallbackGroup: GroupWithMembers = {
                        id: group.group_id,
                        name: group.group_name,
                        memberCount: 1,
                        role: group.role,
                        members: [{
                            id: group.user_id,
                            name: group.user_name,
                            email: group.user_email,
                            role: group.role,
                            picture: group.user_picture,
                        }],
                    };
                    return {
                        group: fallbackGroup,
                        pets: [] as GroupPetInfo[],
                        groupId: group.group_id,
                    };
                }
            });

            const groupsData = await Promise.all(groupsDataPromises);

            // Separate groups and pets for storage
            const groups: GroupWithMembers[] = groupsData.map(data => data.group);
            const groupPetsMap: Record<string, GroupPetInfo[]> = {};
            groupsData.forEach(data => {
                groupPetsMap[data.groupId] = data.pets;
            });

            const result: FetchGroupsWithMembersResult = {
                groups,
                groupPets: groupPetsMap
            };

            return result;

        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch groups with members');
        }
    }
);

// Type for fetchGroupPets result
interface FetchGroupPetsResult {
    groupId: string;
    pets: GroupPetInfo[];
}

// Type for fetchGroupPets error
interface FetchGroupPetsError {
    groupId: string;
    error: string;
}

// Async thunk to fetch pets for a specific group
export const fetchGroupPets = createAsyncThunk<
    FetchGroupPetsResult,
    string,
    { rejectValue: FetchGroupPetsError }
>(
    'group/fetchGroupPets',
    async (groupId, { rejectWithValue }) => {
        try {
            const response = await groupService.getGroupPets(groupId);

            if (response.status !== 1) {
                throw new Error(response.message || 'Failed to fetch group pets');
            }

            return {
                groupId,
                pets: response.data || [],
            };
        } catch (error: any) {
            return rejectWithValue({
                groupId,
                error: error.message || 'Failed to fetch group pets'
            });
        }
    }
);

// Async thunk to refresh pets for a specific group (forces re-fetch)
export const refreshGroupPets = createAsyncThunk<
    FetchGroupPetsResult,
    string
>(
    'group/refreshGroupPets',
    async (groupId, { dispatch }) => {
        return dispatch(fetchGroupPets(groupId)).unwrap();
    }
);

const groupSlice = createSlice({
    name: 'group',
    initialState,
    reducers: {
        clearGroupState: (state) => {
            state.groups = null;
            state.groupPets = {};
            state.isLoading = false;
            state.isLoadingPets = {};
            state.error = null;
            state.petsError = {};
        },
        clearError: (state) => {
            state.error = null;
        },
        clearGroupPetsCache: (state, action: { payload: string }) => {
            // Clear cache for a specific group
            delete state.groupPets[action.payload];
            delete state.isLoadingPets[action.payload];
            delete state.petsError[action.payload];
        },
        clearAllGroupPetsCache: (state) => {
            // Clear all pets cache
            state.groupPets = {};
            state.isLoadingPets = {};
            state.petsError = {};
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
                state.error = action.payload ?? 'Unknown error';
            })
            // Handle deleteGroup
            .addCase(deleteGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(deleteGroup.fulfilled, (state, action) => {
                state.isLoading = false;
                // Remove the deleted group from the state
                if (state.groups) {
                    state.groups = state.groups.filter(group => group.id !== action.payload);
                }
            })
            .addCase(deleteGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Unknown error';
            })
            // Handle fetchMyGroupsWithMembers
            .addCase(fetchMyGroupsWithMembers.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchMyGroupsWithMembers.fulfilled, (state, action) => {
                state.isLoading = false;
                // Store both groups and their pets - no type assertion needed!
                state.groups = action.payload.groups;
                state.groupPets = action.payload.groupPets;
                // Mark all groups as not loading since we fetched pets already
                Object.keys(action.payload.groupPets).forEach(groupId => {
                    state.isLoadingPets[groupId] = false;
                });
            })
            .addCase(fetchMyGroupsWithMembers.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Unknown error';
            })
            // Handle joinGroup
            .addCase(joinGroup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(joinGroup.fulfilled, (state) => {
                state.isLoading = false;
                // Groups list will be refreshed by fetchMyGroupsWithMembers called in the thunk
            })
            .addCase(joinGroup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Unknown error';
            })
            // Handle fetchGroupPets
            .addCase(fetchGroupPets.pending, (state, action) => {
                const groupId = action.meta.arg;
                state.isLoadingPets[groupId] = true;
                delete state.petsError[groupId];
            })
            .addCase(fetchGroupPets.fulfilled, (state, action) => {
                const { groupId, pets } = action.payload;
                state.isLoadingPets[groupId] = false;
                state.groupPets[groupId] = pets;
            })
            .addCase(fetchGroupPets.rejected, (state, action) => {
                if (action.payload) {
                    state.isLoadingPets[action.payload.groupId] = false;
                    state.petsError[action.payload.groupId] = action.payload.error;
                }
            })
            // Handle logout from auth slice - clear group state
            .addCase(logout, (state) => {
                state.groups = null;
                state.groupPets = {};
                state.isLoading = false;
                state.isLoadingPets = {};
                state.error = null;
                state.petsError = {};
            });
    }
});

export const { clearGroupState, clearError, clearGroupPetsCache, clearAllGroupPetsCache } = groupSlice.actions;
export default groupSlice.reducer;
