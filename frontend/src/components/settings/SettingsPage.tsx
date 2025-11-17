import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Users,
  Crown,
  Eye,
  ChevronDown,
  ChevronUp,
  Plus,
  LogOut,
  UserPlus,
  Trash2,
  MoreVertical,
  PawPrint
} from 'lucide-react';
import { useAuth, useGroup, usePet } from '../../hooks';
import { useAppDispatch } from '../../hooks/redux';
import { refreshCurrentUser } from '../../store/slices/authSlice';
import { fetchAccessiblePets } from '../../store/slices/petSlice';
import type { UserRole, GroupRole, PetInfo } from '../../types';
import { CreateGroupForm, CreateInvitationForm, EditUserInfoModal, EditPetInfoModal, CreatePetForm, AssignPetToGroupModal } from '../forms';
import { DeleteConfirmDialog } from '../common/DeleteConfirmDialog';
import { GroupPetsList } from './GroupPetsList';
import { getPhotoUrl } from '../../api';
// Helper function to convert API role to UI role
const normalizeRole = (role: GroupRole): UserRole => {
  return (role.charAt(0).toUpperCase() + role.slice(1)) as UserRole;
};

// Helper functions for role styling (same as PetSelectionPage)
const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'Creator':
      return <Crown className="w-4 h-4 text-orange" />;
    case 'Member':
      return <Users className="w-4 h-4 text-mint" />;
    case 'Viewer':
      return <Eye className="w-4 h-4 text-gray-500" />;
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case 'Creator':
      return 'bg-orange/20 text-orange border-orange/30';
    case 'Member':
      return 'bg-mint/20 text-mint border-mint/30';
    case 'Viewer':
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { groups, isLoading, error, fetchGroups, removeGroup, join } = useGroup();
  const { userPets, getAvailablePets } = usePet();
  const dispatch = useAppDispatch();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupTabs, setGroupTabs] = useState<Record<string, 'members' | 'pets'>>({});
  const [inviteCode, setInviteCode] = useState('');
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [selectedGroupForInvite, setSelectedGroupForInvite] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedGroupForDelete, setSelectedGroupForDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreatePetForm, setShowCreatePetForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [petToAssign, setPetToAssign] = useState<PetInfo | null>(null);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [selectedPetForEdit, setSelectedPetForEdit] = useState<PetInfo | null>(null);
  const [openPetMenuId, setOpenPetMenuId] = useState<string | null>(null);

  // Ensure pet data is loaded when component mounts
  useEffect(() => {
    if (!userPets) {
      console.log('📋 SettingsPage: Loading pet data...');
      getAvailablePets();
    }
  }, [userPets, getAvailablePets]);

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
      // Initialize tab to 'members' if not set
      if (!groupTabs[groupId]) {
        setGroupTabs(prev => ({ ...prev, [groupId]: 'members' }));
      }
    }
    setExpandedGroups(newExpanded);
  };

  const setGroupTab = (groupId: string, tab: 'members' | 'pets') => {
    setGroupTabs(prev => ({ ...prev, [groupId]: tab }));
  };

  const getGroupTab = (groupId: string): 'members' | 'pets' => {
    return groupTabs[groupId] || 'members';
  };

  const handleCreatePet = () => {
    setShowCreatePetForm(true);
  };

  const handlePetCreated = async (message: string) => {
    setSuccessMessage(message);
    // Refresh the pets list using Redux
    await dispatch(fetchAccessiblePets());
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleCreateGroup = () => {
    setShowCreateGroupForm(true);
  };

  const handleGroupCreated = async (message: string) => {
    setSuccessMessage(message);
    // Refresh the groups list
    await fetchGroups();
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleLogout = () => {
    logout();
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleEditSuccess = async (message: string) => {
    setSuccessMessage(message);
    // Refresh user data
    await dispatch(refreshCurrentUser());
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleInviteToGroup = (groupId: string, groupName: string) => {
    setSelectedGroupForInvite({ id: groupId, name: groupName });
    setShowInvitationForm(true);
  };

  const handleInvitationSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    setSelectedGroupForDelete({ id: groupId, name: groupName });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGroupForDelete) return;

    setIsDeleting(true);
    try {
      await removeGroup(selectedGroupForDelete.id);
      setSuccessMessage(`Group "${selectedGroupForDelete.name}" has been deleted`);
      setShowDeleteConfirm(false);
      setSelectedGroupForDelete(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to delete group:', error);
      setSuccessMessage('Failed to delete group. Please try again.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleJoinGroup = async () => {
    // Validate input
    const trimmedCode = inviteCode.trim().toUpperCase();
    if (!trimmedCode) {
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setSuccessMessage(null);

    try {
      await join({ invite_code: trimmedCode });
      setSuccessMessage('Successfully joined the group!');
      setInviteCode(''); // Clear input
      // Groups list will be automatically refreshed by the thunk
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Failed to join group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join group. Please check the invite code and try again.';
      setJoinError(errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const handleAssignPetClick = (pet: PetInfo) => {
    setPetToAssign(pet);
    setShowAssignModal(true);
  };

  const handleAssignSuccess = async (message: string) => {
    setSuccessMessage(message);
    // Refresh pets and groups to update the UI
    await dispatch(fetchAccessiblePets());
    await fetchGroups();
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleAssignClose = () => {
    setShowAssignModal(false);
    setPetToAssign(null);
  };

  const handleEditPet = (pet: PetInfo) => {
    setSelectedPetForEdit(pet);
    setShowEditPetModal(true);
    setOpenPetMenuId(null); // Close the menu
  };

  const handlePetEditSuccess = async (message: string) => {
    setSuccessMessage(message);
    // Refresh pets to update the UI
    await dispatch(fetchAccessiblePets());
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditPetClose = () => {
    setShowEditPetModal(false);
    setSelectedPetForEdit(null);
  };

  // Filter user's owned pets (where user is the owner)
  const myOwnedPets = userPets?.filter(petAccess => {
    const isOwner = petAccess.pet.owner_id === user?.id;
    return isOwner;
  }) || [];

  if (!user) return null;

  return (
    <div className="p-4 space-y-6 pb-24 lg:p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-600 text-sm">✓ {successMessage}</p>
        </div>
      )}

      {/* Section 1: User Info Card */}
      <div className="card-3d p-6">
        <div className="flex items-center relative">
          {/* User Avatar */}
          <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d">
            {user.picture ? (
              <img
                src={
                  user.picture.startsWith('http')
                    ? user.picture
                    : getPhotoUrl(user.picture) || ''
                }
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="ml-4 flex-1">
            <div className="flex items-center mb-1">
              <User className="w-4 h-4 text-gray-500 mr-2" />
              <h2 className="text-xl font-bold text-earth">{user.name}</h2>
            </div>
            <div className="flex items-center text-gray-600">
              <Mail className="w-4 h-4 text-gray-400 mr-2" />
              <p className="text-sm">{user.email}</p>
            </div>
          </div>

          {/* Three-dot Menu Button */}
          <button
            onClick={handleEditProfile}
            className="absolute top-0 right-0 p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Edit Profile"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Section 3: My Pets */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-earth px-2">My Pets</h3>

            <div className="card-3d p-4 flex flex-col" style={{ height: '450px' }}>
              <div className="flex items-center mb-4">
                <PawPrint className="w-5 h-5 text-orange mr-2" />
                <h4 className="font-semibold text-earth">My Pets</h4>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {myOwnedPets.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <PawPrint className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">You don't own any pets yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myOwnedPets.map((petAccess) => {
                      const pet = petAccess.pet;
                      const petPhotoUrl = getPhotoUrl(pet.photo_url);
                      const isMenuOpen = openPetMenuId === pet.id;
                      return (
                        <div
                          key={pet.id}
                          className="border border-gray-200 rounded-lg p-3 bg-white hover:shadow-md transition-shadow relative"
                        >
                          <div className="flex items-center">
                            {/* Pet Info */}
                            <div className="flex items-center flex-1">
                              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                                {petPhotoUrl ? (
                                  <img
                                    src={petPhotoUrl}
                                    alt={pet.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-sm">
                                    {pet.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="ml-3 flex-1">
                                <h5 className="font-semibold text-gray-800">{pet.name}</h5>
                                <p className="text-xs text-gray-600">
                                  {pet.breed || pet.pet_type} • {pet.gender || 'Unknown'}
                                </p>
                                {pet.group_name ? (
                                  <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-mint/20 text-mint text-xs mt-1">
                                    <Users className="w-3 h-3 mr-1" />
                                    {pet.group_name}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500 mt-1">Personal Pet</p>
                                )}
                              </div>
                            </div>

                            {/* Three-dot Menu Button */}
                            <button
                              onClick={() => setOpenPetMenuId(isMenuOpen ? null : pet.id)}
                              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                              title="More options"
                            >
                              <MoreVertical className="w-5 h-5 text-gray-600" />
                            </button>
                          </div>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className="absolute right-3 top-16 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[160px]">
                              <button
                                onClick={() => handleEditPet(pet as PetInfo)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <PawPrint className="w-4 h-4" />
                                <span>Edit Info</span>
                              </button>
                              <button
                                onClick={() => {
                                  handleAssignPetClick(pet as PetInfo);
                                  setOpenPetMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Users className="w-4 h-4" />
                                <span>Assign to Group</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Section 2: Group Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-earth px-2">Group Management</h3>

            {/* Join Group Card */}
            <div className="card-3d p-4" style={{ height: '160px' }}>
              <div className="flex items-center mb-3">
                <UserPlus className="w-5 h-5 text-mint mr-2" />
                <h4 className="font-semibold text-earth">Join a Group</h4>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setJoinError(null);
                  }}
                  placeholder="Enter invite code to join"
                  className={`w-full px-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-mint focus:border-mint transition-colors text-earth ${
                    joinError ? 'border-red-300' : 'border-mint/30'
                  }`}
                  disabled={isJoining}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isJoining) {
                      handleJoinGroup();
                    }
                  }}
                />
                {joinError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-red-600 text-xs">{joinError}</p>
                  </div>
                )}
                <button
                  onClick={handleJoinGroup}
                  disabled={isJoining}
                  className="btn-3d w-full py-2 text-sm text-white bg-mint hover:bg-mint/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: '#B8D8D8',
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isJoining ? 'Joining...' : 'Join Group'}</span>
                </button>
              </div>
            </div>

            {/* My Groups List */}
            <div className="card-3d p-4 flex flex-col" style={{ height: '274px' }}>
              <div className="flex items-center mb-4">
                <Users className="w-5 h-5 text-earth mr-2" />
                <h4 className="font-semibold text-earth">My Groups</h4>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50 animate-pulse" />
                    <p className="text-sm">Loading groups...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-6 text-red-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{error}</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">You're not in any groups yet</p>
                    <p className="text-xs mt-1 text-gray-400">Use the invite code above to join</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groups.map((group) => {
                      const normalizedRole = normalizeRole(group.role);
                      return (
                        <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          {/* Group Header - Clickable */}
                          <div
                            className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => toggleGroup(group.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-gray-800">{group.name}</h5>
                                  {expandedGroups.has(group.id) ? (
                                    <ChevronUp className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-600">
                                    {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                                  </span>
                                  <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getRoleColor(normalizedRole)}`}>
                                    {getRoleIcon(normalizedRole)}
                                    <span className="ml-1">{normalizedRole}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Group Details - Expandable */}
                          {expandedGroups.has(group.id) && (
                            <div className="p-4 bg-white border-t border-gray-200">
                              {/* Tab Navigation */}
                              <div className="flex border-b border-gray-200 mb-4">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupTab(group.id, 'members');
                                  }}
                                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    getGroupTab(group.id) === 'members'
                                      ? 'text-mint border-b-2 border-mint'
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span>Members ({group.memberCount})</span>
                                  </div>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGroupTab(group.id, 'pets');
                                  }}
                                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    getGroupTab(group.id) === 'pets'
                                      ? 'text-mint border-b-2 border-mint'
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <PawPrint className="w-4 h-4" />
                                    <span>Pets</span>
                                  </div>
                                </button>
                              </div>

                              {/* Tab Content */}
                              {getGroupTab(group.id) === 'members' ? (
                                <>
                                  {/* Members List */}
                                  <div className="mb-4">
                                    <div className="space-y-2">
                                      {group.members.map((member: { id: string; name: string; email: string; role: GroupRole; picture?: string }) => {
                                        const memberNormalizedRole = normalizeRole(member.role);
                                        return (
                                          <div key={member.id} className="flex items-center justify-between py-2">
                                            <div className="flex items-center flex-1">
                                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-earth overflow-hidden">
                                                {member.picture ? (
                                                  <img
                                                    src={member.picture?.startsWith('http') ? member.picture : getPhotoUrl(member.picture) || ''}
                                                    alt={member.name}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  member.name.charAt(0).toUpperCase()
                                                )}
                                              </div>
                                              <div className="ml-3">
                                                <p className="text-sm font-medium text-gray-800">{member.name}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                              </div>
                                            </div>
                                            <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs ${getRoleColor(memberNormalizedRole)}`}>
                                              {getRoleIcon(memberNormalizedRole)}
                                              <span className="ml-1">{memberNormalizedRole}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <>
                                  {/* Pets List */}
                                  <div className="mb-4">
                                    <GroupPetsList
                                      groupId={group.id}
                                      groupName={group.name}
                                      userRole={group.role}
                                    />
                                  </div>
                                </>
                              )}

                              {/* Action Buttons - Based on Role */}
                              {(normalizedRole === 'Creator' || normalizedRole === 'Member') && (
                                <div className="flex gap-2 pt-2 border-t border-gray-200">
                                  {/* Invite Button - For Creator and Member */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInviteToGroup(group.id, group.name);
                                    }}
                                    className="btn-3d flex-1 py-2 text-sm text-white hover:bg-mint/90 transition-colors flex items-center justify-center gap-2"
                                    style={{
                                      backgroundColor: '#B8D8D8',
                                    }}
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Invite</span>
                                  </button>

                                  {/* Delete Button - Only for Creator */}
                                  {normalizedRole === 'Creator' && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGroup(group.id, group.name);
                                      }}
                                      className="btn-3d flex-1 py-2 text-sm text-white hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                                      style={{
                                        backgroundColor: '#EF4444',
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Full width at bottom */}
      {/* Section 4: Action Buttons */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-earth px-2">Quick Actions</h3>

      {/* Create New Pet Button */}
      <button
        onClick={handleCreatePet}
        className="btn-3d w-full py-4 text-white bg-orange hover:bg-orange/90 transition-all duration-200 flex items-center justify-center gap-3"
        style={{
          backgroundColor: '#F4C2A1',
          border: '2px solid #e8b690'
        }}
      >
        <Plus className="w-5 h-5" />
        <span className="font-semibold">Create New Pet</span>
      </button>

      {/* Create New Group Button */}
      <button
        onClick={handleCreateGroup}
        className="btn-3d w-full py-4 text-white hover:bg-mint/90 transition-all duration-200 flex items-center justify-center gap-3"
        style={{
          backgroundColor: '#B8D8D8',
        }}
      >
        <Users className="w-5 h-5" />
        <span className="font-semibold">Create New Group</span>
      </button>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="btn-3d w-full py-4 text-white hover:bg-mint/90 transition-all duration-200 flex items-center justify-center gap-3"
        style={{
          backgroundColor: '#4A5568',
        }}
      >
        <LogOut className="w-5 h-5" />
        <span className="font-semibold">Logout</span>
      </button>
    </div>

    {/* Create Group Form Modal */}
    <CreateGroupForm
      isOpen={showCreateGroupForm}
      onClose={() => setShowCreateGroupForm(false)}
      onSuccess={handleGroupCreated}
    />

    {/* Create Invitation Form Modal */}
    {selectedGroupForInvite && (
      <CreateInvitationForm
        isOpen={showInvitationForm}
        onClose={() => {
          setShowInvitationForm(false);
          setSelectedGroupForInvite(null);
        }}
        groupId={selectedGroupForInvite.id}
        groupName={selectedGroupForInvite.name}
        onSuccess={handleInvitationSuccess}
      />
    )}

    {/* Delete Confirmation Dialog */}
    {selectedGroupForDelete && (
      <DeleteConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedGroupForDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Group"
        itemName={selectedGroupForDelete.name}
        isLoading={isDeleting}
      />
    )}

    {/* Edit User Info Modal */}
    <EditUserInfoModal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      onSuccess={handleEditSuccess}
      user={user}
    />

    {/* Create Pet Form Modal */}
    <CreatePetForm
      isOpen={showCreatePetForm}
      onClose={() => setShowCreatePetForm(false)}
      onSuccess={handlePetCreated}
    />

    {/* Assign Pet to Group Modal */}
    {showAssignModal && petToAssign && (
      <AssignPetToGroupModal
        isOpen={showAssignModal}
        onClose={handleAssignClose}
        pet={petToAssign}
        onSuccess={handleAssignSuccess}
      />
    )}

    {/* Edit Pet Info Modal */}
    {showEditPetModal && selectedPetForEdit && (
      <EditPetInfoModal
        isOpen={showEditPetModal}
        onClose={handleEditPetClose}
        pet={selectedPetForEdit}
        onSuccess={handlePetEditSuccess}
      />
    )}
  </div>
  );
};
