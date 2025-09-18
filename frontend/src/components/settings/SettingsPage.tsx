import React, { useState } from 'react';
import {
  User,
  Users,
  ChevronDown,
  LogOut,
  Copy,
  Share,
  Plus,
  Check,
  Crown,
  Eye,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  mockUsers,
  getUserGroupMemberships,
  getGroupMembers,
  generateInviteCode,
  validateInviteCode
} from '../../data/mockData';
import type { GroupMembership } from '../../types';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<GroupMembership | null>(null);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string>('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please log in to access settings</p>
      </div>
    );
  }

  // Get user's group memberships
  const userGroups = getUserGroupMemberships(user.id);

  // Set default selected group if not set
  React.useEffect(() => {
    if (userGroups.length > 0 && !selectedGroup) {
      setSelectedGroup(userGroups[0]);
    }
  }, [userGroups, selectedGroup]);

  // Get members of selected group
  const groupMembers = selectedGroup ? getGroupMembers(selectedGroup.groupId) : [];

  // Get member details with user info
  const groupMembersWithDetails = groupMembers.map(membership => {
    const memberUser = mockUsers.find(u => u.id === membership.userId);
    return {
      ...membership,
      user: memberUser
    };
  });

  const canCreateInvite = selectedGroup?.role === 'Creator' || selectedGroup?.role === 'Member';

  const handleGroupSelect = (group: GroupMembership) => {
    setSelectedGroup(group);
    setShowGroupDropdown(false);
    setGeneratedInviteCode('');
    setJoinMessage('');
  };

  const handleGenerateInvite = () => {
    if (!selectedGroup || !canCreateInvite) return;

    const newCode = generateInviteCode();
    setGeneratedInviteCode(newCode);
  };

  const handleCopyInviteCode = async () => {
    if (!generatedInviteCode) return;

    try {
      await navigator.clipboard.writeText(generatedInviteCode);
      setCopyMessage('Copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShareInviteURL = () => {
    if (!generatedInviteCode) return;

    const shareUrl = `https://app.pethealthtracker.com/join?code=${generatedInviteCode}`;

    if (navigator.share) {
      navigator.share({
        title: 'Join our pet care group',
        text: `Join "${selectedGroup?.group.name}" to help take care of our pets!`,
        url: shareUrl
      });
    } else {
      // Fallback: copy URL to clipboard
      navigator.clipboard.writeText(shareUrl);
      setCopyMessage('Share URL copied!');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  };

  const handleJoinGroup = () => {
    if (!inviteCodeInput.trim()) return;

    const validInvite = validateInviteCode(inviteCodeInput.trim());
    if (validInvite) {
      setJoinMessage('Successfully joined the group! 🎉');
      setInviteCodeInput('');
      // In a real app, this would refresh the user's group memberships
    } else {
      setJoinMessage('Invalid or expired invite code. Please check and try again.');
    }

    setTimeout(() => setJoinMessage(''), 4000);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Creator':
        return <Crown className="w-3 h-3 text-orange" />;
      case 'Member':
        return <UserCheck className="w-3 h-3 text-mint" />;
      case 'Viewer':
        return <Eye className="w-3 h-3 text-gray-500" />;
      default:
        return null;
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'Creator':
        return 'bg-orange/20 text-orange border-orange/30';
      case 'Member':
        return 'bg-mint/20 text-mint border-mint/30';
      case 'Viewer':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="p-4 space-y-4 pb-6">
      {/* 1. Account Information Card */}
      <div className="card-3d p-4">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2 text-earth" />
          Account Information
        </h2>

        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-orange/20 flex items-center justify-center flex-shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <User className="w-8 h-8 text-earth" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
            <p className="text-gray-600">{user.email}</p>

            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Google Account: Connected
              </div>
              <p className="text-gray-500">Member since: January 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Group Management Card */}
      <div className="card-3d p-4">
        <h2 className="font-semibold text-gray-800 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-mint" />
          Group Management
        </h2>

        {/* Group Selector Dropdown */}
        {userGroups.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Available Groups:
            </label>
            <div className="relative">
              <button
                onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                className="btn-3d btn-3d-mint w-full p-3 flex items-center justify-between text-gray-700"
              >
                <div className="flex items-center space-x-2">
                  <span>{selectedGroup?.group.icon || '🐕'}</span>
                  <span className="font-medium">{selectedGroup?.group.name}</span>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getRoleBadgeClass(selectedGroup?.role || '')}`}>
                    {getRoleIcon(selectedGroup?.role || '')}
                    <span className="ml-1">{selectedGroup?.role}</span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showGroupDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-3d border border-gray-200 z-50 max-h-48 overflow-y-auto">
                  {userGroups.map((group) => (
                    <button
                      key={group.groupId}
                      onClick={() => handleGroupSelect(group)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                        selectedGroup?.groupId === group.groupId ? 'bg-orange/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span>{group.group.icon}</span>
                          <span className="font-medium text-gray-800">{group.group.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getRoleBadgeClass(group.role)}`}>
                            {getRoleIcon(group.role)}
                            <span className="ml-1">{group.role}</span>
                          </div>
                          <span className="text-xs text-gray-500">{group.group.memberCount} members</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Group Info */}
        {selectedGroup && (
          <div className="mb-4">
            <div className="text-center mb-4">
              <div className="text-2xl mb-1">{selectedGroup.group.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800">{selectedGroup.group.name}</h3>
              <p className="text-sm text-gray-600">{groupMembers.length} members</p>
            </div>

            {/* Members List */}
            <div className="space-y-2 mb-4">
              {groupMembersWithDetails.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-orange/20 flex items-center justify-center">
                      {member.user?.avatar ? (
                        <img
                          src={member.user.avatar}
                          alt={member.user.name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-4 h-4 text-earth" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{member.user?.name || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                    {getRoleIcon(member.role)}
                    <span className="ml-1">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Others Section */}
        {selectedGroup && canCreateInvite && (
          <div className="border-t border-gray-200 pt-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-3 text-center">
              ──── Invite Others ────
            </h4>

            <div className="text-center space-y-3">
              <button
                onClick={handleGenerateInvite}
                className="btn-3d w-full py-3 text-white font-medium"
                disabled={!!generatedInviteCode}
              >
                <Plus className="w-4 h-4 mr-2" />
                Generate Invite Code
              </button>

              {generatedInviteCode && (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Invite Code:</p>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 text-lg font-mono font-bold text-gray-800 bg-white px-3 py-2 rounded border text-center">
                        {generatedInviteCode}
                      </code>
                      <button
                        onClick={handleCopyInviteCode}
                        className="btn-3d btn-3d-mint p-2 text-gray-700"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copyMessage && (
                      <p className="text-xs text-green-600 mt-1 flex items-center justify-center">
                        <Check className="w-3 h-3 mr-1" />
                        {copyMessage}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleShareInviteURL}
                    className="btn-3d btn-3d-earth w-full py-3 text-white font-medium"
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share Invite URL
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Join New Group Section */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-medium text-gray-800 mb-3 text-center">
            ──── Join New Group ────
          </h4>

          <div className="space-y-3">
            <input
              type="text"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter invite code"
              className="input-3d w-full text-center font-mono tracking-wide"
              maxLength={8}
            />

            <button
              onClick={handleJoinGroup}
              disabled={!inviteCodeInput.trim()}
              className="btn-3d btn-3d-mint w-full py-3 text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join Group
            </button>

            {joinMessage && (
              <div className={`text-center text-sm p-2 rounded-lg ${
                joinMessage.includes('Successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {joinMessage}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Sign Out Button */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="card-3d w-full p-4 text-center hover:shadow-3d-hover transition-all duration-200 bg-orange/10 hover:bg-orange/20"
        >
          <div className="flex items-center justify-center space-x-2 text-orange font-medium">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </div>
        </button>
      </div>

      {/* Overlay to close dropdown */}
      {showGroupDropdown && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setShowGroupDropdown(false)}
        />
      )}
    </div>
  );
};
