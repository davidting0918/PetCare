import React, { useState } from 'react';
import { Mail, Heart, PawPrint } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    const success = await login(email);
    if (!success) {
      setError('User not found. Try john.doe@example.com or jane.doe@example.com');
    }
  };

  const handleQuickLogin = (email: string) => {
    setEmail(email);
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-orange rounded-full p-4 shadow-3d">
            <Heart className="w-8 h-8 text-earth" />
          </div>
          <PawPrint className="w-6 h-6 text-earth ml-2" />
        </div>
        <h1 className="text-3xl font-bold text-earth mb-2">Pet Health Tracker</h1>
        <p className="text-earth/70">Keep your furry friends healthy and happy</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md">
        <div className="card-3d p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">Welcome Back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-3d pl-10 w-full"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-3d w-full py-3 px-4 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing In...' : 'Sign In with Email'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3 text-center">Quick Login (Demo)</p>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickLogin('john.doe@example.com')}
                disabled={isLoading}
                className="btn-3d btn-3d-mint w-full py-2 px-4 text-gray-700 text-sm font-medium"
              >
                Login as John Doe
              </button>
              <button
                onClick={() => handleQuickLogin('jane.doe@example.com')}
                disabled={isLoading}
                className="btn-3d btn-3d-mint w-full py-2 px-4 text-gray-700 text-sm font-medium"
              >
                Login as Jane Doe
              </button>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div className="card-3d p-4">
          <h3 className="font-semibold text-gray-800 mb-3 text-center">App Features</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-orange rounded-full mr-2"></div>
              Daily Food Tracking
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-mint rounded-full mr-2"></div>
              Weight Progress
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-orange rounded-full mr-2"></div>
              Medicine Schedules
            </div>
            <div className="flex items-center text-gray-600">
              <div className="w-2 h-2 bg-mint rounded-full mr-2"></div>
              Family Collaboration
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
