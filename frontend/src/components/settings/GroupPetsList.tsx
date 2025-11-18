import React from 'react';
import { PawPrint, Crown, Users as UsersIcon, Eye } from 'lucide-react';
import { useGroup } from '../../hooks';

interface GroupPetsListProps {
  groupId: string;
  groupName: string;
  userRole: 'creator' | 'member' | 'viewer';
}

const getPermissionIcon = (permission: string) => {
  switch (permission) {
    case 'owner':
      return <Crown className="w-3 h-3 text-orange" />;
    case 'creator':
      return <Crown className="w-3 h-3 text-mint" />;
    case 'member':
      return <UsersIcon className="w-3 h-3 text-mint" />;
    case 'viewer':
      return <Eye className="w-3 h-3 text-gray-500" />;
    default:
      return null;
  }
};

const getPermissionColor = (permission: string) => {
  switch (permission) {
    case 'owner':
      return 'bg-orange/20 text-orange border-orange/30';
    case 'creator':
      return 'bg-mint/20 text-mint border-mint/30';
    case 'member':
      return 'bg-mint/10 text-mint border-mint/20';
    case 'viewer':
      return 'bg-gray-100 text-gray-600 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

const getPermissionLabel = (permission: string) => {
  switch (permission) {
    case 'owner':
      return 'Owner';
    case 'creator':
      return 'Group Creator';
    case 'member':
      return 'Group Member';
    case 'viewer':
      return 'Viewer';
    default:
      return permission;
  }
};

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
                    {getPermissionIcon(pet.user_permission)}
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
