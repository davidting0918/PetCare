import React, { useState } from 'react';
import { UserPlus, X, Copy, Check } from 'lucide-react';
import { groupService } from '../../api';
import type { GroupRole } from '../../types';
import { COLORS } from '../../constants/colors';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-3d max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-mint/20 rounded-full flex items-center justify-center mr-3">
              <UserPlus className="w-5 h-5 text-mint" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Invite to Group</h2>
              <p className="text-sm text-gray-500">{groupName}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <div className="space-y-2">
                  <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={selectedRole === 'member'}
                      onChange={(e) => setSelectedRole(e.target.value as GroupRole)}
                      className="mt-1 mr-3"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Member</div>
                      <div className="text-xs text-gray-500">
                        Can view group, create invitations, and record pet care activities
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="role"
                      value="viewer"
                      checked={selectedRole === 'viewer'}
                      onChange={(e) => setSelectedRole(e.target.value as GroupRole)}
                      className="mt-1 mr-3"
                      disabled={isLoading}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">Viewer</div>
                      <div className="text-xs text-gray-500">
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
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 btn-3d text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: COLORS.mint,
                  }}
                >
                  {isLoading ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>
          ) : (
            /* Success View with Invite Code */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm font-medium mb-2">✓ Invitation Created Successfully!</p>
                <p className="text-green-700 text-xs">Share the code below with your invitee.</p>
              </div>

              {/* Invite Code Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-mint/50 rounded-lg bg-mint/5 font-mono text-lg text-center font-bold text-gray-800"
                  />
                  <button
                    onClick={handleCopyCode}
                    className="btn-3d p-3 bg-mint/20 hover:bg-mint/30 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-mint" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This code will expire in 7 days
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="w-full btn-3d py-2 text-white"
                style={{
                  backgroundColor: COLORS.mint,
                  border: '2px solid #a8c8c8'
                }}
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
