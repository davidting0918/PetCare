import React, { useState } from 'react';
import { X, Users, UserPlus, Calendar, User } from 'lucide-react';
import type { GroupRole } from '../../types';
import { getRoleIcon, getRoleColor, getRoleLabel } from '../../utils/roleUtils';

export interface InvitationData {
  id: string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-lg w-full overflow-hidden">
        {/* Header — accent-pink banner replaces the legacy mint gradient */}
        <div className="bg-accent-pink/15 border-b border-accent-pink/30 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-full p-2 transition-colors"
            disabled={isJoining}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-accent-pink p-3 rounded-full">
              <UserPlus className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Group Invitation</h2>
              <p className="text-text-secondary text-sm">Review details before joining</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Group Info Card */}
          <div className="bg-surface-1 rounded-xl p-5 border border-border-subtle">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-accent-teal/15 p-3 rounded-full">
                <Users className="w-6 h-6 text-accent-teal" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-tertiary mb-1">Group Name</p>
                <h3 className="text-xl font-bold text-text-primary">{invitationData.group_name}</h3>
              </div>
            </div>

            {/* Invited By */}
            <div className="flex items-center gap-3 py-3 border-t border-border-subtle">
              <User className="w-5 h-5 text-text-tertiary" />
              <div className="flex-1">
                <p className="text-xs text-text-tertiary">Invited by</p>
                <p className="text-sm font-medium text-text-primary">{invitationData.invited_by_name}</p>
              </div>
            </div>

            {/* Expiration */}
            <div className="flex items-center gap-3 py-3 border-t border-border-subtle">
              <Calendar className="w-5 h-5 text-text-tertiary" />
              <div className="flex-1">
                <p className="text-xs text-text-tertiary">Invitation Status</p>
                <p className="text-sm font-medium text-text-primary">
                  {formatExpiryText()}
                  <span className="text-xs text-text-tertiary ml-2">
                    ({expiresAt.toLocaleDateString()})
                  </span>
                </p>
              </div>
            </div>


          {/* Role */}
          <div className="flex items-center gap-3 py-3 border-t border-border-subtle">
            <div className="flex items-start gap-3">
              <div className={`inline-flex items-center px-3 py-2 rounded-full border font-medium ${getRoleColor(invitationData.role)}`}>
                {getRoleIcon(invitationData.role, { size: 'medium' })}
                <span className="ml-2">{getRoleLabel(invitationData.role)}</span>
              </div>
            </div>
          </div>
          </div>


          {/* Warning for Viewer role */}
          {invitationData.role === 'viewer' && (
            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <p className="text-xs text-warning">
                <strong>Note:</strong> As a viewer, you will have read-only access. You won't be able to edit or manage group content.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border-subtle">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
              disabled={isJoining}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isJoining}
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
