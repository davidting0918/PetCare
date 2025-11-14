import React, { useState } from 'react';
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
  Trash2
} from 'lucide-react';
import { useAuth, useGroup } from '../../hooks';
import type { UserRole, GroupRole } from '../../types';
import { CreateGroupForm, CreateInvitationForm } from '../forms';
import { DeleteConfirmDialog } from '../common/DeleteConfirmDialog';

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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showJoinGroup, setShowJoinGroup] = useState(false);
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

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreatePet = () => {
    console.log('Create new pet - to be implemented');
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
      setJoinError('Please enter an invite code');
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setSuccessMessage(null);

    try {
      await join({ invite_code: trimmedCode });
      setSuccessMessage('Successfully joined the group!');
      setInviteCode(''); // Clear input
      setShowJoinGroup(false); // Collapse the section
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

  if (!user) return null;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-600 text-sm">✓ {successMessage}</p>
        </div>
      )}

      {/* Section 1: User Info Card */}
      <div className="card-3d p-6">
        <div className="flex items-center">
          {/* User Avatar */}
          <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d">
            {user.picture ? (
              <img
                src={user.picture}
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
        </div>
      </div>

      {/* Section 2: Group Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-earth px-2">Group Management</h3>

        {/* My Groups */}
        <div className="card-3d p-4">
          <div className="flex items-center mb-4">
            <Users className="w-5 h-5 text-earth mr-2" />
            <h4 className="font-semibold text-earth">My Groups</h4>
          </div>

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
                        {/* Members List */}
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Members</p>
                          <div className="space-y-2">
                            {group.members.map((member: { id: string; name: string; email: string; role: GroupRole }) => {
                              const memberNormalizedRole = normalizeRole(member.role);
                              return (
                                <div key={member.id} className="flex items-center justify-between py-2">
                                  <div className="flex items-center flex-1">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-earth">
                                      {member.name.charAt(0).toUpperCase()}
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

                        {/* Action Buttons - Based on Role */}
                        {(normalizedRole === 'Creator' || normalizedRole === 'Member') && (
                          <div className="flex gap-2">
                            {/* Invite Button - For Creator and Member */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInviteToGroup(group.id, group.name);
                              }}
                              className="btn-3d flex-1 py-2 text-sm text-white hover:bg-mint/90 transition-colors flex items-center justify-center gap-2"
                              style={{
                                backgroundColor: '#B8D8D8',
                                border: '2px solid #a8c8c8'
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
                                  border: '2px solid #DC2626'
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

        {/* Join Group Section */}
        <div className="card-3d p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowJoinGroup(!showJoinGroup)}
          >
            <div className="flex items-center">
              <UserPlus className="w-5 h-5 text-mint mr-2" />
              <h4 className="font-semibold text-earth">Join a Group</h4>
            </div>
            {showJoinGroup ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>

          {showJoinGroup && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">
                Enter an invite code to join an existing group
              </p>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setJoinError(null); // Clear error when user types
                }}
                placeholder="Enter invite code (e.g., ABC123)"
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-mint/50 focus:border-mint mb-3 ${
                  joinError ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isJoining}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isJoining) {
                    handleJoinGroup();
                  }
                }}
              />
              {joinError && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-2">
                  <p className="text-red-600 text-sm">{joinError}</p>
                </div>
              )}
              <button
                onClick={handleJoinGroup}
                disabled={isJoining}
                className="btn-3d w-full py-2 text-sm text-white bg-mint hover:bg-mint/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: '#B8D8D8',
                  border: '2px solid #a8c8c8'
                }}
              >
                {isJoining ? 'Joining...' : 'Join Group'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Action Buttons */}
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
          message="Are you sure you want to delete this group? This action cannot be undone. All group data will be marked as inactive."
          itemName={selectedGroupForDelete.name}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};
