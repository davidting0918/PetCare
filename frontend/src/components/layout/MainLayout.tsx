import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, RefreshCw } from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';
import type { NavigationTab } from '../../types';
import type { PetAccess } from '../../store/slices/petSlice';
import { usePet, useRefresh } from '../../hooks';

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
  const { refreshAll, isRefreshing } = useRefresh();
  const [showPetSelector, setShowPetSelector] = useState(false);

  const handlePetChange = (petAccess: PetAccess) => {
    selectPet(petAccess.pet);
    setShowPetSelector(false);
  };

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      {/* Header */}
      <div className="bg-surface-1 border-b border-border-subtle shadow-card sticky top-0 z-40">
        <div className="max-w-md lg:max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {showBackButton && (
                <button
                  onClick={onBackClick}
                  className="p-2 mr-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={refreshAll}
                disabled={isRefreshing}
                className={`p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors ${isRefreshing ? 'opacity-75 cursor-not-allowed' : ''}`}
                title="Refresh all data"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Pet Selector */}
              {selectedPet && userPets && userPets.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setShowPetSelector(!showPetSelector)}
                  className="flex items-center px-3 py-2 text-sm rounded-xl bg-surface-2 text-text-primary border border-border-default hover:bg-surface-3 hover:border-border-strong transition-colors"
                >
                  <span className="max-w-24 truncate">{selectedPet.name}</span>
                  <ChevronDown className="w-4 h-4 ml-1" />
                </button>

                {showPetSelector && userPets && (
                  <div className="absolute right-0 top-full mt-2 bg-surface-2 rounded-2xl shadow-elevated border border-border-default min-w-48 z-50 overflow-hidden">
                    {userPets.map((petAccess) => (
                      <button
                        key={petAccess.petId}
                        onClick={() => handlePetChange(petAccess)}
                        className={`w-full px-4 py-3 text-left hover:bg-surface-3 transition-colors ${
                          selectedPet.id === petAccess.petId ? 'bg-accent-pink/10 text-accent-pink' : 'text-text-primary'
                        }`}
                      >
                        <div className="font-medium">{petAccess.pet.name}</div>
                        <div className="text-xs text-text-tertiary">{petAccess.pet.breed}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
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
      <div className="max-w-md lg:max-w-7xl mx-auto min-h-[calc(100vh-140px)]">
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
