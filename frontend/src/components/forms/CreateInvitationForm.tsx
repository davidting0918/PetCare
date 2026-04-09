import React, { useState } from 'react';
import { UserPlus, X, Copy, Check } from 'lucide-react';
import { groupService } from '../../api';
import type { GroupRole } from '../../types';

interface CreateInvitationFormProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  onSuccess?: (message: string) => void;
}

export const CreateInvitationForm: React.FC<CreateInvitationFormProps> = ({
  isOpen,
  onClose,
  groupId,
  groupName,
  onSuccess
}) => {
  const [selectedRole, setSelectedRole] = useState<GroupRole>('member');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await groupService.createInvitation(groupId, { role: selectedRole });

      if (response.status === 1 && response.data) {
        setInviteCode(response.data.invite_code);
        onSuccess?.(`Invitation created successfully!`);
      } else {
        throw new Error(response.message || 'Failed to create invitation');
      }
    } catch (err) {
      console.error('❌ CreateInvitationForm: Error creating invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    setSelectedRole('member');
    setInviteCode(null);
    setError(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent-pink/15 rounded-full flex items-center justify-center mr-3">
              <UserPlus className="w-5 h-5 text-accent-pink" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Invite to Group</h2>
              <p className="text-sm text-text-tertiary">{groupName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6">
          {!inviteCode ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
                  <p className="text-danger text-sm">{error}</p>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <div className="space-y-2">
                  <label className="flex items-start p-3 border border-border-default rounded-xl cursor-pointer hover:bg-surface-3 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={selectedRole === 'member'}
                      onChange={(e) => setSelectedRole(e.target.value as GroupRole)}
                      className="mt-1 mr-3 accent-accent-pink"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">Member</div>
                      <div className="text-xs text-text-tertiary">
                        Can view group, create invitations, and record pet care activities
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border border-border-default rounded-xl cursor-pointer hover:bg-surface-3 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={selectedRole === 'viewer'}
                      onChange={(e) => setSelectedRole(e.target.value as GroupRole)}
                      className="mt-1 mr-3 accent-accent-pink"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-text-primary">Viewer</div>
                      <div className="text-xs text-text-tertiary">
                        Read-only access to group content
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>
          ) : (
            /* Success View with Invite Code */
            <div className="space-y-4">
              <div className="bg-success/10 border border-success/30 rounded-xl p-4">
                <p className="text-success text-sm font-medium mb-2">✓ Invitation Created Successfully!</p>
                <p className="text-success/80 text-xs">Share the code below with your invitee.</p>
              </div>

              {/* Invite Code Display */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Invitation Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="input-field flex-1 font-mono text-lg text-center font-bold"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="p-3 rounded-xl bg-surface-3 hover:bg-surface-3/80 border border-border-default transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-success" />
                    ) : (
                      <Copy className="w-5 h-5 text-accent-pink" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-2">
                  This code will expire in 7 days
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="btn-primary w-full py-2"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
