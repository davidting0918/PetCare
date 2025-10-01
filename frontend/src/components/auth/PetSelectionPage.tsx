import React, { useState, useEffect } from 'react';
import { Crown, Users, Eye, ArrowRight, LogOut, Plus, PawPrint } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CreatePetForm } from '../pet';
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
  const { user, selectPet, getUserPets, logout, refreshUserPets } = useAuth();
  const userPets = getUserPets(); // Get pets directly from AuthContext - no need for local state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState<string | null>(null);

  // Load pets when component mounts if not already loaded
  useEffect(() => {
    const loadPetsIfNeeded = async () => {
      // Only load if user is authenticated and pets are null (not loaded yet)
      // userPets is null initially, then becomes [] or Pet[] after API call
      if (user && userPets === null && !petsLoading) {
        setPetsLoading(true);
        setPetsError(null);
        try {
          await refreshUserPets();
        } catch (error) {
          console.error('Failed to load pets:', error);
          setPetsError('無法載入寵物清單。請稍後再試。');
        } finally {
          setPetsLoading(false);
        }
      }
    };

    loadPetsIfNeeded();
  }, [user, userPets, petsLoading]); // Don't include refreshUserPets to avoid infinite loops

  const handleRefreshPets = async () => {
    setPetsLoading(true);
    setPetsError(null);
    try {
      await refreshUserPets();
    } catch (error) {
      console.error('Failed to refresh pets:', error);
      setPetsError('無法重新載入寵物清單。請稍後再試。');
    } finally {
      setPetsLoading(false);
    }
  };

  const handlePetSelect = (petAccess: any) => {
    selectPet(petAccess.pet);
  };

  const handleCreatePetSuccess = () => {
    setShowCreateForm(false);
    // The pet list will be automatically refreshed by AuthContext after creation
  };

  const handleCreatePetCancel = () => {
    setShowCreateForm(false);
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

      {/* Create Pet Button */}
      {!showCreateForm && (
        <div className="max-w-md mx-auto mb-6">
          <button
            onClick={() => setShowCreateForm(true)}
            className="w-full btn-3d btn-3d-mint p-4 flex items-center justify-center space-x-2 text-white font-semibold"
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Pet</span>
          </button>
        </div>
      )}

      {/* Create Pet Form */}
      <CreatePetForm
        isVisible={showCreateForm}
        onSuccess={handleCreatePetSuccess}
        onCancel={handleCreatePetCancel}
      />

      {/* Error Message */}
      {petsError && (
        <div className="max-w-md mx-auto mb-4">
          <div className="card-3d p-4 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div className="text-red-800">
                <p className="font-medium">載入失敗</p>
                <p className="text-sm mt-1">{petsError}</p>
              </div>
              <button
                onClick={handleRefreshPets}
                className="btn-3d btn-3d-orange text-white px-3 py-1 text-sm"
                disabled={petsLoading}
              >
                重試
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pet List */}
      <div className="space-y-4 max-w-md mx-auto">
        {petsLoading && !showCreateForm && (
          <div className="card-3d p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange/20 rounded-full flex items-center justify-center animate-pulse">
              <PawPrint className="w-8 h-8 text-orange animate-bounce" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">載入中...</h3>
            <p className="text-gray-600">正在取得您的寵物清單</p>
          </div>
        )}

        {!petsLoading && userPets.length === 0 && !showCreateForm ? (
          <div className="card-3d p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-orange/20 rounded-full flex items-center justify-center">
              <PawPrint className="w-8 h-8 text-orange" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Welcome to PetCare!</h3>
            <p className="text-gray-600 mb-4">No pets found in your account</p>
            <p className="text-sm text-gray-500 mb-4">
              Create your first pet to start tracking their health, meals, and activities.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-3d btn-3d-orange text-white px-6 py-2 font-medium"
            >
              Get Started
            </button>
          </div>
        ) : (
          !petsLoading && userPets.map((petAccess) => (
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
