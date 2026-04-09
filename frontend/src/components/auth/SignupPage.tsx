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
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements — soft accent glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-accent-pink/15 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-accent-purple/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-20 h-20 bg-accent-teal/10 rounded-full blur-xl animate-bounce delay-500"></div>
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10">
        <div className="flex items-center justify-center mb-4 group">
          <div className="bg-accent-pink rounded-full p-4 shadow-elevated transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
            <Heart className="w-8 h-8 text-text-primary animate-pulse" />
          </div>
          <PawPrint className="w-6 h-6 text-accent-pink ml-2 animate-bounce" />
        </div>
        <h1 className="text-4xl font-bold text-text-primary mb-2 transform transition-all duration-300 hover:scale-105">
          Join PetCare
        </h1>
        <p className="text-text-secondary text-lg">Create your account to start tracking your pet's health</p>
      </div>

      {/* Signup Form */}
      <div className="w-full max-w-md relative z-10">
        <div className="surface-card p-8 mb-6">
          <h2 className="text-2xl font-semibold text-text-primary mb-6 text-center">
            Create Your Account
          </h2>

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-text-secondary mb-2">
                Full Name
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 group-focus-within:text-accent-pink transition-colors z-10" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`input-field pl-10 ${errors.name ? 'border-danger' : ''}`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-danger">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 group-focus-within:text-accent-pink transition-colors z-10" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`input-field pl-10 ${errors.email ? 'border-danger' : ''}`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-danger">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-text-secondary mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 group-focus-within:text-accent-pink transition-colors z-10" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`input-field pl-10 pr-10 ${errors.password ? 'border-danger' : ''}`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-accent-pink transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-danger">{errors.password}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-text-secondary mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 group-focus-within:text-accent-pink transition-colors z-10" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-danger' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-accent-pink transition-colors z-10"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-danger">{errors.confirmPassword}</p>}
            </div>

            {errors.submit && (
              <div className="text-danger text-sm bg-danger/10 p-4 rounded-xl border border-danger/30 transform animate-shake">
                {errors.submit}
              </div>
            )}

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-text-primary mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Your Account'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="font-medium text-accent-pink hover:text-accent-pink-hover focus:outline-none focus:underline transition-colors"
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
