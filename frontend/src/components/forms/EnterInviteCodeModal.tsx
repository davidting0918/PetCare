import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';

interface EnterInviteCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (inviteCode: string) => Promise<void>;
}

export const EnterInviteCodeModal: React.FC<EnterInviteCodeModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInviteCode('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    // Only allow letters and limit to 6 characters
    const filtered = value.replace(/[^A-Z]/g, '').slice(0, 6);
    setInviteCode(filtered);
    setError(null);
  };

  const submitInviteCode = async () => {
    // Validate input
    if (inviteCode.length !== 6) {
      setError('Invite code must be 6 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(inviteCode);
      // Don't close here - parent will handle closing after showing preview
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find invitation';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitInviteCode();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inviteCode.length === 6 && !isLoading) {
      e.preventDefault();
      void submitInviteCode();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-2 rounded-2xl border border-border-default shadow-elevated max-w-md w-full overflow-hidden">
        {/* Header — accent-pink banner replaces the legacy mint gradient */}
        <div className="bg-accent-pink/15 border-b border-accent-pink/30 p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary hover:bg-surface-3 rounded-full p-2 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-accent-pink p-3 rounded-full">
              <UserPlus className="w-6 h-6 text-text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Join a Group</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="inviteCode" className="block text-sm font-medium text-text-secondary mb-2">
              Invitation Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="ABCDEF"
              className={`input-field text-center text-2xl font-bold tracking-widest uppercase ${
                error ? 'border-danger' : ''
              }`}
              disabled={isLoading}
              maxLength={6}
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-danger/10 border border-danger/30 rounded-xl p-3">
              <p className="text-danger text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteCode.length !== 6 || isLoading}
              className="btn-primary flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
