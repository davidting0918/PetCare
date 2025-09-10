import React, { useState, useEffect } from 'react';
import { authService } from '@/services/authService';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get user info from localStorage first
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">🐾 PetCare</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <img 
                    src={user.picture} 
                    alt={user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-white">{user.name}</span>
                </>
              )}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to PetCare! 🎉
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Your pet's health and happiness dashboard
          </p>
          
          {user && (
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8 max-w-md mx-auto">
              <img 
                src={user.picture} 
                alt={user.name}
                className="w-20 h-20 rounded-full mx-auto mb-4"
              />
              <h3 className="text-xl font-semibold text-white mb-2">
                Hello, {user.name}!
              </h3>
              <p className="text-gray-400">{user.email}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
