import React, { useState } from 'react';
import { Crown, Users, Eye, ArrowRight, LogOut, Plus, PawPrint } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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
  const { user, selectPet, getUserPets, createPet, logout } = useAuth();
  const userPets = getUserPets(); // Get pets directly from AuthContext - no need for local state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    pet_type: 'dog',
    breed: '',
    current_weight_kg: '',
    daily_calorie_target: ''
  });

  const handlePetSelect = (petAccess: any) => {
    selectPet(petAccess.pet);
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreatePet = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const petData = {
        name: createFormData.name.trim(),
        pet_type: createFormData.pet_type,
        breed: createFormData.breed.trim() || undefined,
        current_weight_kg: createFormData.current_weight_kg ? parseFloat(createFormData.current_weight_kg) : undefined,
        daily_calorie_target: createFormData.daily_calorie_target ? parseInt(createFormData.daily_calorie_target) : undefined
      };

      console.log('🐾 Creating pet with data:', petData);
      await createPet(petData);

      // Reset form and close modal - pets list will be automatically updated by AuthContext
      setCreateFormData({
        name: '',
        pet_type: 'dog',
        breed: '',
        current_weight_kg: '',
        daily_calorie_target: ''
      });
      setShowCreateForm(false);

      console.log('✅ Pet created successfully');
    } catch (error) {
      console.error('❌ Failed to create pet:', error);
      alert('Failed to create pet. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateFormData({
      name: '',
      pet_type: 'dog',
      breed: '',
      current_weight_kg: '',
      daily_calorie_target: ''
    });
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
            disabled={isLoading}
          >
            <Plus className="w-5 h-5" />
            <span>Create Your First Pet</span>
          </button>
        </div>
      )}

      {/* Create Pet Form */}
      {showCreateForm && (
        <div className="card-3d p-6 max-w-md mx-auto mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <PawPrint className="w-5 h-5 text-orange mr-2" />
            Create New Pet
          </h3>

          <form onSubmit={handleCreatePet} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pet Name *
              </label>
              <input
                type="text"
                name="name"
                value={createFormData.name}
                onChange={handleCreateFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
                placeholder="Enter pet name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pet Type *
              </label>
              <select
                name="pet_type"
                value={createFormData.pet_type}
                onChange={handleCreateFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
                required
              >
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="bird">Bird</option>
                <option value="rabbit">Rabbit</option>
                <option value="fish">Fish</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breed
              </label>
              <input
                type="text"
                name="breed"
                value={createFormData.breed}
                onChange={handleCreateFormChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
                placeholder="e.g., Golden Retriever"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Weight (kg)
              </label>
              <input
                type="number"
                name="current_weight_kg"
                value={createFormData.current_weight_kg}
                onChange={handleCreateFormChange}
                step="0.1"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
                placeholder="e.g., 5.2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Daily Calorie Target
              </label>
              <input
                type="number"
                name="daily_calorie_target"
                value={createFormData.daily_calorie_target}
                onChange={handleCreateFormChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange focus:border-orange"
                placeholder="e.g., 400"
              />
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading || !createFormData.name.trim()}
                className="flex-1 btn-3d btn-3d-orange text-white py-2 px-4 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Pet'}
              </button>
              <button
                type="button"
                onClick={handleCancelCreate}
                disabled={isLoading}
                className="flex-1 btn-3d btn-3d-earth text-white py-2 px-4 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pet List */}
      <div className="space-y-4 max-w-md mx-auto">
        {userPets.length === 0 && !showCreateForm ? (
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

      {/* Role Information */}
      <div className="card-3d p-4 max-w-md mx-auto mt-6">
        <h3 className="font-semibold text-gray-800 mb-3">Permission Levels</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <Crown className="w-4 h-4 text-orange mr-2" />
            <span className="text-gray-700"><strong>Creator:</strong> Full access to all features</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 text-mint mr-2" />
            <span className="text-gray-700"><strong>Member:</strong> Can log activities and view data</span>
          </div>
          <div className="flex items-center">
            <Eye className="w-4 h-4 text-gray-500 mr-2" />
            <span className="text-gray-700"><strong>Viewer:</strong> Can only view data</span>
          </div>
        </div>
      </div>
    </div>
  );
};
