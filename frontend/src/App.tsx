import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignupPage';
import { PetSelectionPage } from './components/auth/PetSelectionPage';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { MealPage } from './components/meal/MealPage';
import { WeightPage } from './components/weight/WeightPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { ComingSoon } from './components/common/ComingSoon';
import type { NavigationTab } from './types';

// Loading component
const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-primary flex items-center justify-center">
    <div className="card-3d p-6">
      <div className="animate-pulse text-center">
        <div className="w-12 h-12 bg-orange/20 rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  </div>
);

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Pet selection guard
const PetGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedPet, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!selectedPet) {
    return <Navigate to="/select-pet" replace />;
  }

  return <>{children}</>;
};

// Main app layout wrapper
const AppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const navigate = useNavigate();
  const location = useLocation();

  // Update activeTab based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/dashboard')) setActiveTab('dashboard');
    else if (path.includes('/meal')) setActiveTab('meal');
    else if (path.includes('/medicine')) setActiveTab('medicine');
    else if (path.includes('/weight')) setActiveTab('weight');
    else if (path.includes('/settings')) setActiveTab('settings');
  }, [location.pathname]);

  const handleTabChange = (tab: NavigationTab) => {
    setActiveTab(tab);
    navigate(`/${tab}`);
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
      onTabChange={handleTabChange}
      title={getPageTitle()}
    >
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/meal" element={<MealPage />} />
        <Route
          path="/medicine"
          element={
            <ComingSoon
              title="Medicine Management"
              description="Keep track of medications, set reminders, and log when medicines are given."
            />
          }
        />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </MainLayout>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Default redirect to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Login page - redirect to dashboard if already authenticated */}
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* Signup page - redirect to dashboard if already authenticated */}
      <Route
        path="/signup"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <SignUpPage />
        }
      />

      {/* Pet selection page - protected route */}
      <Route
        path="/select-pet"
        element={
          <ProtectedRoute>
            <PetSelectionPage />
          </ProtectedRoute>
        }
      />

      {/* Main app routes - require authentication and pet selection */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PetGuard>
              <AppLayout />
            </PetGuard>
          </ProtectedRoute>
        }
      />
    </Routes>
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
