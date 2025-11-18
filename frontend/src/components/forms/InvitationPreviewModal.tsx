import React, { useState } from 'react';
import { X, Users, Crown, Eye, UserPlus, Calendar, User } from 'lucide-react';
import type { GroupRole } from '../../types';

interface InvitationData {
  id: string;
  group_id: string;
  group_name: string;
  invited_by_name: string;
  invite_code: string;
  role: GroupRole;
  created_at: string;
  expires_at: string;
}

interface InvitationPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitationData: InvitationData | null;
  onConfirmJoin: () => Promise<void>;
}

// Helper functions for role styling
const getRoleIcon = (role: GroupRole) => {
  switch (role) {
    case 'creator':
      return <Crown className="w-5 h-5 text-orange" />;
    case 'member':
      return <Users className="w-5 h-5 text-mint" />;
    case 'viewer':
      return <Eye className="w-5 h-5 text-gray-500" />;
  }
};

const getRoleColor = (role: GroupRole) => {
  switch (role) {
    case 'creator':
      return 'bg-orange/20 text-orange border-orange/30';
    case 'member':
      return 'bg-mint/20 text-mint border-mint/30';
    case 'viewer':
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const getRoleLabel = (role: GroupRole) => {
  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const InvitationPreviewModal: React.FC<InvitationPreviewModalProps> = ({
  isOpen,
  onClose,
  invitationData,
  onConfirmJoin,
}) => {
  const [isJoining, setIsJoining] = useState(false);

  if (!isOpen || !invitationData) return null;

  const handleConfirm = async () => {
    setIsJoining(true);
    try {
      await onConfirmJoin();
      // Parent will handle closing and showing success message
    } catch (error) {
      console.error('Failed to join group:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // Format expiration date
  const expiresAt = new Date(invitationData.expires_at);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const formatExpiryText = () => {
    if (daysUntilExpiry < 1) {
      return 'Expires today';
    } else if (daysUntilExpiry === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${daysUntilExpiry} days`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-mint to-mint/80 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            disabled={isJoining}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Group Invitation</h2>
              <p className="text-mint-light text-sm">Review details before joining</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Group Info Card */}
          <div className="bg-gray-50 rounded-lg p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-mint/20 p-3 rounded-full">
                <Users className="w-6 h-6 text-mint" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Group Name</p>
                <h3 className="text-xl font-bold text-earth">{invitationData.group_name}</h3>
              </div>
            </div>

            {/* Invited By */}
            <div className="flex items-center gap-3 py-3 border-t border-gray-200">
              <User className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Invited by</p>
                <p className="text-sm font-medium text-gray-800">{invitationData.invited_by_name}</p>
              </div>
            </div>

            {/* Expiration */}
            <div className="flex items-center gap-3 py-3 border-t border-gray-200">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Invitation Status</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatExpiryText()}
                  <span className="text-xs text-gray-500 ml-2">
                    ({expiresAt.toLocaleDateString()})
                  </span>
                </p>
              </div>
            </div>


          {/* Role */}
          <div className="flex items-center gap-3 py-3 border-t border-gray-200">
            <div className="flex items-start gap-3">
              <div className={`inline-flex items-center px-3 py-2 rounded-full border-2 font-medium ${getRoleColor(invitationData.role)}`}>
                {getRoleIcon(invitationData.role)}
                <span className="ml-2">{getRoleLabel(invitationData.role)}</span>
              </div>
            </div>
          </div>
          </div>


          {/* Warning for Viewer role */}
          {invitationData.role === 'viewer' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> As a viewer, you will have read-only access. You won't be able to edit or manage group content.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isJoining}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                backgroundColor: '#B8D8D8',
              }}
            >
              <UserPlus className="w-5 h-5" />
              <span>{isJoining ? 'Joining...' : 'Join Group'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
