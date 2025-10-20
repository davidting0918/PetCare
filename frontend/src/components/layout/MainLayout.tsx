import React, { useState } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import type { NavigationTab } from '../../types';
import { usePet } from '../../hooks';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  title,
  showBackButton = false,
  onBackClick
}) => {
  const { selectedPet, selectPet, userPets } = usePet();
  const [showPetSelector, setShowPetSelector] = useState(false);

  const handlePetChange = (petAccess: any) => {
    selectPet(petAccess.pet);
    setShowPetSelector(false);
  };

  return (
    <div className="min-h-screen bg-primary pb-20">
      {/* Header */}
      <div className="bg-white shadow-3d sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {showBackButton && (
                <button
                  onClick={onBackClick}
                  className="btn-3d p-2 mr-3 text-gray-600"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-semibold text-gray-800">{title}</h1>
            </div>

            {/* Pet Selector */}
            {selectedPet && userPets && userPets.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowPetSelector(!showPetSelector)}
                  className="btn-3d btn-3d-mint flex items-center px-3 py-2 text-sm"
                >
                  <span className="max-w-24 truncate">{selectedPet.name}</span>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </button>

                {showPetSelector && userPets && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-3d border border-gray-200 min-w-48 z-50">
                    {userPets.map((petAccess) => (
                      <button
                        key={petAccess.petId}
                        onClick={() => handlePetChange(petAccess)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                          selectedPet.id === petAccess.petId ? 'bg-orange/10 text-orange' : 'text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{petAccess.pet.name}</div>
                        <div className="text-xs text-gray-500">{petAccess.pet.breed}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Overlay to close pet selector */}
        {showPetSelector && (
          <div
            className="fixed inset-0 z-30"
            onClick={() => setShowPetSelector(false)}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto min-h-[calc(100vh-140px)]">
        {children}
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
    </div>
  );
};
