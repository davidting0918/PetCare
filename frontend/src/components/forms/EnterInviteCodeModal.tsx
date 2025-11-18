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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inviteCode.length === 6 && !isLoading) {
      handleSubmit(e as any);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-mint to-mint/80 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-full">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Join a Group</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Code
            </label>
            <input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="ABCDEF"
              className={`w-full px-4 py-3 border-2 rounded-lg text-center text-2xl font-bold tracking-widest uppercase focus:ring-2 focus:ring-mint focus:border-mint transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              disabled={isLoading}
              maxLength={6}
              autoFocus
              autoComplete="off"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteCode.length !== 6 || isLoading}
              className="flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: inviteCode.length === 6 && !isLoading ? '#B8D8D8' : '#E5E7EB',
              }}
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
