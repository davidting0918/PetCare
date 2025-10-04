import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useAuthInitialization } from './hooks';
import { LoginPage } from './components/auth/LoginPage';
import { SignUpPage } from './components/auth/SignupPage';
import { PetSelectionPage } from './components/auth/PetSelectionPage';
import { MainLayout } from './components/layout/MainLayout';
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
        <Route
          path="/dashboard"
          element={
            <ComingSoon
              title="Dashboard"
              description="Your pet's health overview and daily summary will be displayed here."
            />
          }
        />
        <Route
          path="/meal"
          element={
            <ComingSoon
              title="Meal Tracking"
              description="Track your pet's meals, calories, and feeding schedule."
            />
          }
        />
        <Route
          path="/medicine"
          element={
            <ComingSoon
              title="Medicine Management"
              description="Keep track of medications, set reminders, and log when medicines are given."
            />
          }
        />
        <Route
          path="/weight"
          element={
            <ComingSoon
              title="Weight Tracking"
              description="Monitor your pet's weight progress and set health goals."
            />
          }
        />
        <Route
          path="/settings"
          element={
            <ComingSoon
              title="Settings"
              description="Manage your account, pet profiles, and app preferences."
            />
          }
        />
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
        path="/select_pet"
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
  // 🆕 現代化做法：直接在根組件初始化認證
  useAuthInitialization();

  return <AppContent />;
};

export default App;
