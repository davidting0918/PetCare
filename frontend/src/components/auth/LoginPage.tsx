import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Mail, Heart, PawPrint, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, googleLogin, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLoginSuccess = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google login failed. No credential received.');
      return;
    }

    setError('');
    googleLogin(credentialResponse.credential)
      .then(() => {
        navigate('/select-pet');
      })
      .catch(() => {
        setError('Google login failed. Please try again.');
      });
  };

  const handleGoogleLoginError = () => {
    setError('Google login was cancelled or failed. Please try again.');
  };

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
      navigate('/select-pet');
    } catch {
      setError('Login failed. Please check your email and password');
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
          Pet Health Tracker
        </h1>
        <p className="text-text-secondary text-lg">Keep your furry friends healthy and happy</p>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-md relative z-10">
        <div className="surface-card p-8 mb-6">
          <h2 className="text-2xl font-semibold text-text-primary mb-6 text-center">
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-text-secondary mb-2">
                Email Address
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-5 h-5 group-focus-within:text-accent-pink transition-colors z-10" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                  disabled={isLoading}
                />
              </div>
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-accent-pink transition-colors z-10"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-danger text-sm bg-danger/10 p-4 rounded-xl border border-danger/30 transform animate-shake">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-text-primary mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In with Email'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-subtle"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface-1 text-text-tertiary">Or</span>
            </div>
          </div>

          {/* Google Login Button */}
          <div className={`flex justify-center ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
              useOneTap={false}
            />
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="font-medium text-accent-pink hover:text-accent-pink-hover focus:outline-none focus:underline transition-colors"
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
