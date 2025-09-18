import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { PetSelectionPage } from './components/auth/PetSelectionPage';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { MealPage } from './components/meal/MealPage';
import { WeightPage } from './components/weight/WeightPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ComingSoon } from './components/common/ComingSoon';
import type { NavigationTab } from './types';

const AppContent: React.FC = () => {
  const { isAuthenticated, selectedPet, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="card-3d p-6">
          <div className="animate-pulse text-center">
            <div className="w-12 h-12 bg-orange/20 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (!selectedPet) {
    return <PetSelectionPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'meal':
        return <MealPage />;
      case 'medicine':
        return (
          <ComingSoon
            title="Medicine Management"
            description="Keep track of medications, set reminders, and log when medicines are given."
          />
        );
      case 'weight':
        return <WeightPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'meal':
        return 'Meals';
      case 'medicine':
        return 'Medicine';
      case 'weight':
        return 'Weight';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      title={getPageTitle()}
    >
      {renderContent()}
    </MainLayout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
