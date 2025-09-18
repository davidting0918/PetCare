import React, { useState } from 'react';
import {
  User,
  Heart,
  Users,
  Bell,
  Shield,
  Download,
  Upload,
  HelpCircle,
  Info,
  ChevronRight,
  Settings as SettingsIcon,
  LogOut,
  Edit,
  Crown,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { mockFamilyMembers } from '../../data/mockData';
import { ProfileEditModal } from './ProfileEditModal';
import { FamilyMembersModal } from './FamilyMembersModal';
import { NotificationSettingsModal } from './NotificationSettingsModal';
import { AppPreferencesModal } from './AppPreferencesModal';

export const SettingsPage: React.FC = () => {
  const { user, logout, getUserPets, selectedPet } = useAuth();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showFamilyMembers, setShowFamilyMembers] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAppPreferences, setShowAppPreferences] = useState(false);

  const userPets = getUserPets();

  if (!user) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Please log in to access settings</p>
      </div>
    );
  }

  const handleExportData = () => {
    // Mock data export
    const exportData = {
      user: user,
      pets: userPets,
      exportDate: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `petcare-data-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <>
      <div className="p-4 space-y-4 pb-6">
        {/* Profile Section */}
        <div className="card-3d p-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-16 h-16 rounded-full bg-orange/20 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-8 h-8 text-earth" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">{user.name}</h2>
              <p className="text-gray-600 text-sm">{user.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                Managing {userPets.length} pet{userPets.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowProfileEdit(true)}
              className="btn-3d btn-3d-mint p-2 text-gray-700"
              title="Edit Profile"
            >
              <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Current Pet Info */}
        {selectedPet && (
          <div className="card-3d p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Heart className="w-4 h-4 mr-2 text-orange" />
              Current Pet
            </h3>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-orange/20 flex items-center justify-center">
                {selectedPet.photo ? (
                  <img
                    src={selectedPet.photo}
                    alt={selectedPet.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="text-orange font-semibold">
                    {selectedPet.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-800">{selectedPet.name}</h4>
                <p className="text-sm text-gray-600">
                  {selectedPet.breed} • {selectedPet.age} years old
                </p>
                <p className="text-sm text-gray-600">
                  Weight: {selectedPet.weight}kg
                  {selectedPet.targetWeight && ` → ${selectedPet.targetWeight}kg`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pet Management */}
        <div className="card-3d p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center">
              <Heart className="w-4 h-4 mr-2 text-orange" />
              My Pets ({userPets.length})
            </h3>
          </div>
          <div className="space-y-2">
            {userPets.map(petAccess => (
              <div key={petAccess.petId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-orange/20 flex items-center justify-center">
                    {petAccess.pet.photo ? (
                      <img
                        src={petAccess.pet.photo}
                        alt={petAccess.pet.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-orange font-semibold text-sm">
                        {petAccess.pet.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800 text-sm">{petAccess.pet.name}</h4>
                    <p className="text-xs text-gray-500">{petAccess.pet.breed}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    petAccess.role === 'Creator' ? 'bg-orange/20 text-orange' :
                    petAccess.role === 'Member' ? 'bg-mint/20 text-mint' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {petAccess.role === 'Creator' && <Crown className="w-3 h-3 inline mr-1" />}
                    {petAccess.role}
                  </div>
                  {petAccess.role === 'Creator' && (
                    <button className="text-gray-400 hover:text-red-500 p-1">
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-3">
          {/* Family & Sharing */}
          <button
            onClick={() => setShowFamilyMembers(true)}
            className="card-3d w-full p-4 text-left hover:shadow-3d-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-mint/20 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-mint" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Family Members</h3>
                  <p className="text-sm text-gray-600">
                    Manage family access ({mockFamilyMembers.length} members)
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(true)}
            className="card-3d w-full p-4 text-left hover:shadow-3d-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange/20 rounded-lg flex items-center justify-center">
                  <Bell className="w-5 h-5 text-orange" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Meal reminders, medicine alerts, and more
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* App Preferences */}
          <button
            onClick={() => setShowAppPreferences(true)}
            className="card-3d w-full p-4 text-left hover:shadow-3d-hover transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-earth/20 rounded-lg flex items-center justify-center">
                  <SettingsIcon className="w-5 h-5 text-earth" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">App Preferences</h3>
                  <p className="text-sm text-gray-600">
                    Language, units, themes, and defaults
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {/* Privacy & Security */}
          <button className="card-3d w-full p-4 text-left hover:shadow-3d-hover transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-800">Privacy & Security</h3>
                  <p className="text-sm text-gray-600">
                    Data protection and account security
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>

        {/* Data Management */}
        <div className="card-3d p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Data Management</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleExportData}
              className="btn-3d btn-3d-mint p-3 text-gray-700 text-center"
            >
              <Download className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm font-medium">Export Data</span>
            </button>
            <button className="btn-3d btn-3d-mint p-3 text-gray-700 text-center">
              <Upload className="w-4 h-4 mx-auto mb-1" />
              <span className="text-sm font-medium">Import Data</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Backup your pet care data or restore from a backup
          </p>
        </div>

        {/* Support & Info */}
        <div className="card-3d p-4">
          <h3 className="font-semibold text-gray-800 mb-3">Support & Information</h3>
          <div className="space-y-2">
            <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <HelpCircle className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Help & FAQ</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">About Pet Health Tracker</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">Version 1.0.0</p>
            <p className="text-xs text-gray-500 mt-1">
              Made with ❤️ for pet lovers
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="card-3d w-full p-4 text-red-600 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center justify-center space-x-2">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </div>
        </button>
      </div>

      {/* Modals */}
      {showProfileEdit && (
        <ProfileEditModal
          user={user}
          onClose={() => setShowProfileEdit(false)}
        />
      )}

      {showFamilyMembers && (
        <FamilyMembersModal
          onClose={() => setShowFamilyMembers(false)}
        />
      )}

      {showNotifications && (
        <NotificationSettingsModal
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showAppPreferences && (
        <AppPreferencesModal
          onClose={() => setShowAppPreferences(false)}
        />
      )}
    </>
  );
};
