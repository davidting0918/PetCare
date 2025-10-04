import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Heart, PawPrint, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      console.log('🚀 SignupPage: Starting user registration...');

      await signup(formData.name.trim(), formData.email.trim(), formData.password);

      console.log('✅ SignupPage: Registration successful');
      alert('Account created successfully! You can now login with your credentials.');
      navigate('/login');
    } catch (error) {
      console.error('❌ SignupPage: Registration failed:', error);
      let errorMessage = 'Registration failed. Please try again.';

      if (error instanceof Error) {
        // Provide user-friendly error messages for common issues
        if (error.message.includes('API key not configured')) {
          errorMessage = 'Service configuration error. Please contact support or check your setup.';
        } else if (error.message.includes('Invalid API key')) {
          errorMessage = 'Service authentication failed. Please contact support.';
        } else if (error.message.includes('email already exists') || error.message.includes('already registered')) {
          errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setErrors({ submit: errorMessage });
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
          Join PetCare
        </h1>
        <p className="text-earth/70 text-lg">Create your account to start tracking your pet's health</p>
      </div>

      {/* Signup Form with Enhanced Design */}
      <div className="w-full max-w-md relative z-10">
        <div className="card-3d p-8 mb-6 backdrop-blur-sm bg-white/95 border border-white/20">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center bg-gradient-to-r from-earth to-orange bg-clip-text text-transparent">
            Create Your Account
          </h2>

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Name Field */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange transition-colors" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input-3d pl-10 w-full transform transition-all duration-200 focus:scale-105 ${
                    errors.name ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange transition-colors" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-3d pl-10 w-full transform transition-all duration-200 focus:scale-105 ${
                    errors.email ? 'border-red-500' : ''
                  }`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
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
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input-3d pl-10 pr-10 w-full transform transition-all duration-200 focus:scale-105 ${
                    errors.password ? 'border-red-500' : ''
                  }`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div className="transform transition-all duration-300 hover:scale-105">
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-orange transition-colors" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`input-3d pl-10 pr-10 w-full transform transition-all duration-200 focus:scale-105 ${
                    errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            {errors.submit && (
              <div className="text-red-600 text-sm bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200 transform animate-shake">
                {errors.submit}
              </div>
            )}

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-3d w-full py-4 px-4 text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105"
            >
              {false ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Your Account'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium text-orange hover:text-orange/80 focus:outline-none focus:underline transition-colors"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
