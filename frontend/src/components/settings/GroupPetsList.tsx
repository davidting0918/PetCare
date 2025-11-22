import React from 'react';
import { PawPrint } from 'lucide-react';
import { useGroup } from '../../hooks';
import { getRoleIcon, getPermissionColor, getPermissionLabel } from '../../utils/roleUtils';

interface GroupPetsListProps {
  groupId: string;
  groupName: string;
  userRole: 'creator' | 'member' | 'viewer';
}

export const GroupPetsList: React.FC<GroupPetsListProps> = ({
  groupId,
}) => {
  const { getGroupPets, isLoadingGroupPets, getGroupPetsError } = useGroup();

  // Get pets from Redux store (already loaded during initial login)
  const pets = getGroupPets(groupId);
  const isLoading = isLoadingGroupPets(groupId);
  const error = getGroupPetsError(groupId);

  if (isLoading) {
    return (
      <div className="text-center py-6">
        <PawPrint className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-pulse" />
        <p className="text-sm text-gray-500">Loading pets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <PawPrint className="w-8 h-8 mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <PawPrint className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 mb-2">No pets in this group yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pets.map((pet) => {
        return (
          <div
            key={pet.id}
            className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              {/* Pet Photo */}
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                {pet.photo_url ? (
                  <img
                    src={pet.photo_url}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold text-sm">
                    {pet.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Pet Info */}
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-800">{pet.name}</h4>
                </div>
                <p className="text-xs text-gray-600">
                  {pet.breed || pet.pet_type} • {pet.gender || 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {/* Owner Info */}
                  <p className="text-xs text-gray-500">
                    Owner: {pet.owner_name}
                  </p>
                  {/* Permission Badge */}
                  <div
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${getPermissionColor(
                      pet.user_permission
                    )}`}
                  >
                    {getRoleIcon(pet.user_permission as 'owner' | 'creator' | 'member' | 'viewer', { size: 'small' })}
                    <span className="ml-1">{getPermissionLabel(pet.user_permission)}</span>
                  </div>
                </div>
              </div>

              {/* Pet Stats */}
              <div className="ml-3 text-right">
                {pet.current_weight_kg && (
                  <p className="text-xs text-gray-500">
                    Weight: <span className="font-semibold text-gray-700">{pet.current_weight_kg} kg</span>
                  </p>
                )}
                {pet.daily_calorie_target && (
                  <p className="text-xs text-gray-500">
                    Target: <span className="font-semibold text-gray-700">{pet.daily_calorie_target} kcal</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
