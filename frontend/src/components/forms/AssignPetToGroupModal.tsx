import React, { useState, useEffect } from 'react';
import { Users, X, AlertCircle } from 'lucide-react';
import { useGroup } from '../../hooks';
import { petService } from '../../api';
import type { PetInfo } from '../../types';
import { COLORS } from '../../constants/colors';

interface AssignPetToGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: PetInfo;
  onSuccess: (message: string) => void;
}

export const AssignPetToGroupModal: React.FC<AssignPetToGroupModalProps> = ({
  isOpen,
  onClose,
  pet,
  onSuccess
}) => {
  const { groups, clearPetsCache } = useGroup();
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter groups where user is creator
  const creatorGroups = groups.filter(group => group.role === 'creator');

  useEffect(() => {
    if (isOpen) {
      // Set current group as selected if pet is already in a group
      setSelectedGroupId(pet.group_id || '');
      setError(null);
    }
  }, [isOpen, pet.group_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check if selection changed
    if (selectedGroupId === (pet.group_id || '')) {
      setError('Please select a different group or cancel');
      return;
    }

    setIsSubmitting(true);

    try {
      const groupIdToAssign = selectedGroupId === '' ? null : selectedGroupId;
      const oldGroupId = pet.group_id;

      await petService.assignPetToGroup(pet.id, groupIdToAssign);

      // Clear pets cache for both old and new groups to force refresh
      if (oldGroupId) {
        clearPetsCache(oldGroupId);
      }
      if (groupIdToAssign) {
        clearPetsCache(groupIdToAssign);
      }

      const groupName = groupIdToAssign
        ? creatorGroups.find(g => g.id === groupIdToAssign)?.name
        : 'Personal';

      onSuccess(`${pet.name} has been assigned to ${groupName}`);
      handleClose();
    } catch (err: any) {
      console.error('Failed to assign pet to group:', err);
      setError(err.message || 'Failed to assign pet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedGroupId('');
    setError(null);
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
              <Users className="w-5 h-5 text-mint" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Assign Pet to Group</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Pet Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Pet</p>
            <p className="font-semibold text-gray-800">{pet.name}</p>
            <p className="text-xs text-gray-500">
              {pet.breed} • {pet.pet_type}
            </p>
          </div>

          {/* Current Group */}
          {pet.group_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Current Group:</strong> {pet.group_name}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Group
            </label>
            {creatorGroups.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  You don't have any groups where you are the creator. Only pet owners can assign their pets to groups they created.
                </p>
              </div>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-mint/50 focus:border-mint"
                disabled={isSubmitting}
              >
                <option value="">(change to private pet)</option>
                {creatorGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || creatorGroups.length === 0}
              className="flex-1 btn-3d text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: COLORS.mint,
              }}
            >
              {isSubmitting ? 'Assigning...' : 'Assign Pet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
