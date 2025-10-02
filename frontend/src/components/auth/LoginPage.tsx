import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Heart, PawPrint, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await login(email, password);
      // If we reach here, login was successful - navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please check your email and password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-orange/20 to-mint/20 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-orange/20 rounded-full animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-mint/20 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-earth/10 rounded-full animate-bounce delay-500"></div>
      </div>

      {/* Header with Enhanced Animation */}
      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center mb-4 group">
          <div className="bg-gradient-to-br from-orange to-orange/80 rounded-full p-4 shadow-3d transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Heart className="w-8 h-8 text-white animate-pulse" />
          </div>
          <PawPrint className="w-6 h-6 text-earth ml-2 animate-bounce" />
        </div>
        <h1 className="text-4xl font-bold text-earth mb-2 transform transition-all duration-300 hover:scale-105">
          Pet Health Tracker
        </h1>
        <p className="text-earth/70 text-lg">Keep your furry friends healthy and happy</p>
      </div>

      {/* Login Form with Enhanced Design */}
      <div className="w-full max-w-md relative z-10">
        <div className="card-3d p-8 mb-6 backdrop-blur-sm bg-white/95 border border-white/20">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center bg-gradient-to-r from-earth to-orange bg-clip-text text-transparent">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">            {/* Email Field */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange transition-colors" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-3d pl-10 w-full transform transition-all duration-200 focus:scale-105"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange transition-colors" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-3d pl-10 pr-10 w-full transform transition-all duration-200 focus:scale-105"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button

                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200 transform animate-shake">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-3d w-full py-4 px-4 text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In with Email'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:underline transition-colors"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};