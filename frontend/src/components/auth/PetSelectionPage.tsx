import React, { useEffect } from 'react';
import { Crown, Users, Eye, ArrowRight, LogOut, PawPrint } from 'lucide-react';
import { useAuth } from '../../hooks';
import type { UserRole } from '../../types';

const getRoleIcon = (role: UserRole) => {
  switch (role) {
    case 'Creator':
      return <Crown className="w-5 h-5 text-orange" />;
    case 'Member':
      return <Users className="w-5 h-5 text-mint" />;
    case 'Viewer':
      return <Eye className="w-5 h-5 text-gray-500" />;
  }
};

const getRoleColor = (role: UserRole) => {
  switch (role) {
    case 'Creator':
      return 'bg-orange/20 text-orange border-orange/30';
    case 'Member':
      return 'bg-mint/20 text-mint border-mint/30';
    case 'Viewer':
      return 'bg-gray-100 text-gray-600 border-gray-300';
  }
};

export const PetSelectionPage: React.FC = () => {
  const { user, selectPet, getUserPets, logout } = useAuth();
  const userPets = getUserPets(); // Get pets directly from AuthContext

  // Load pets when component mounts if not already loaded
  useEffect(() => {
    // TODO: 當實作 pets API 後，可以在這裡載入寵物資料
    console.log('PetSelectionPage mounted, userPets:', userPets);
  }, [userPets]);

  const handlePetSelect = (petAccess: any) => {
    selectPet(petAccess.pet);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-primary p-4">
        {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-earth">Welcome, {user.name}!</h1>
          <p className="text-earth/70">Select a pet to manage</p>
        </div>
        <button
          onClick={logout}
          className="btn-3d btn-3d-earth p-3 text-white"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Pet List */}
      <div className="space-y-4 max-w-md mx-auto">
        {userPets.length === 0 ? (
          <div className="card-3d p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange/20 rounded-full flex items-center justify-center">
              <PawPrint className="w-8 h-8 text-orange" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to PetCare!</h3>
            <p className="text-gray-600 mb-4">No pets found in your account</p>
            <p className="text-sm text-gray-500">
              Please contact the administrator to add your pet data.
            </p>
          </div>
        ) : (
          userPets.map((petAccess) => (
            <div
              key={petAccess.petId}
              className="card-3d p-4 cursor-pointer group hover:shadow-3d-hover transition-all duration-200"
              onClick={() => handlePetSelect(petAccess)}
            >
              <div className="flex items-center">
                {/* Pet Photo */}
                <div className="w-16 h-16 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden shadow-3d">
                  {petAccess.pet.photo_url ? (
                    <img
                      src={petAccess.pet.photo_url}
                      alt={petAccess.pet.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-orange/30 flex items-center justify-center text-earth font-semibold">
                      {petAccess.pet.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Pet Info */}
                <div className="flex-1 ml-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {petAccess.pet.name}
                    </h3>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>

                  <div className="flex items-center mt-1">
                    <p className="text-sm text-gray-600 mr-3">
                      {petAccess.pet.breed} • {petAccess.pet.pet_type}
                    </p>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center mt-2">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${getRoleColor(petAccess.role)}`}>
                      {getRoleIcon(petAccess.role)}
                      <span className="ml-1">{petAccess.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pet Stats Preview */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="text-gray-500">Weight</p>
                    <p className="font-semibold text-gray-700">
                      {petAccess.pet.current_weight_kg ? `${petAccess.pet.current_weight_kg} kg` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Daily Calories</p>
                    <p className="font-semibold text-gray-700">
                      {petAccess.pet.daily_calorie_target || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Target</p>
                    <p className="font-semibold text-gray-700">
                      {petAccess.pet.target_weight_kg ? `${petAccess.pet.target_weight_kg} kg` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>


    </div>
  );
};
