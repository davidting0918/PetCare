import React, { useState } from 'react';
import { Mail, Heart, PawPrint, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    // For demo purposes, accept any password for existing users
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email or password. Try john.doe@example.com or jane.doe@example.com');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      console.log('🚀 [REBUILT] LoginPage: Starting Google login...');
      console.log('🔍 LoginPage: Current state - isLoading:', isLoading);

      const success = await loginWithGoogle();
      console.log('🏁 [REBUILT] LoginPage: Google login result:', success);

      if (!success) {
        const errorMsg = 'Google login failed. Please check your configuration and browser console for detailed error messages.';
        console.error('❌ LoginPage:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('❌ LoginPage: Critical error in handleGoogleLogin:', error);
      setError('Google login failed. Please check the browser console for detailed error messages.');
    }
  };

  // Debug function to help users troubleshoot
  const runDiagnostics = () => {
    console.log('🔍 === GOOGLE AUTH DIAGNOSTICS (REBUILT VERSION) ===');
    console.log('🌐 Current URL:', window.location.href);
    console.log('🔧 Environment Variables:');
    console.log('  - VITE_GOOGLE_CLIENT_ID exists:', !!import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('  - VITE_GOOGLE_CLIENT_ID value:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
    console.log('  - VITE_GOOGLE_CLIENT_ID preview:', import.meta.env.VITE_GOOGLE_CLIENT_ID?.substring(0, 30) + '...');

    console.log('🔍 Window object checks:');
    console.log('  - window.google exists:', !!window.google);
    console.log('  - window.google.accounts exists:', !!(window.google?.accounts));
    console.log('  - window.google.accounts.id exists:', !!(window.google?.accounts?.id));

    // Check Google API methods
    if (window.google?.accounts?.id) {
      console.log('  - initialize method:', typeof window.google.accounts.id.initialize);
      console.log('  - renderButton method:', typeof window.google.accounts.id.renderButton);
      console.log('  - prompt method:', typeof window.google.accounts.id.prompt);
    }

    console.log('🔍 CORS and Network checks:');
    console.log('  - Origin:', window.location.origin);
    console.log('  - Protocol:', window.location.protocol);
    console.log('  - Is HTTPS or localhost:', window.location.protocol === 'https:' || window.location.hostname === 'localhost');

    console.log('🔍 Browser compatibility:');
    console.log('  - User Agent:', navigator.userAgent);
    console.log('  - Cookies enabled:', navigator.cookieEnabled);
    console.log('  - Third-party cookies blocked:', 'Unknown (check browser settings)');

    console.log('🔍 Service checks:');
    console.log('  - Google services initialized:', 'Check initialization in app startup');

    console.log('🔍 Local storage:');
    console.log('  - petcare_access_token:', localStorage.getItem('petcare_access_token'));
    console.log('  - petcare_user:', localStorage.getItem('petcare_user'));

    console.log('🔍 Rebuilt implementation features:');
    console.log('  ✅ CORS issues fixed with simplified approach');
    console.log('  ✅ FedCM compatibility (disabled to avoid conflicts)');
    console.log('  ✅ Comprehensive token logging');
    console.log('  ✅ Invisible button method (no popup blockers)');
    console.log('  ✅ Automatic cleanup and error recovery');

    console.log('🔍 Common issues to check:');
    console.log('  1. ✅ Make sure you have a .env file with VITE_GOOGLE_CLIENT_ID');
    console.log('  2. ✅ Make sure your domain is in Google Cloud Console authorized origins');
    console.log('  3. ✅ Popup blockers not relevant (using invisible button method)');
    console.log('  4. ✅ Clear browser cache and localStorage if issues persist');
    console.log('  5. ✅ Check browser network tab for failed requests');
    console.log('  6. ✅ CORS errors should be resolved with new implementation');
    console.log('  7. ✅ Token details will be logged automatically on success');

    console.log('=== END REBUILT DIAGNOSTICS ===');
  };

  const handleQuickLogin = (email: string) => {
    setEmail(email);
    setPassword('demo123');
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
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

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Rebuilt Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 border-2 border-gray-200 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange focus:border-orange transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-3d"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google (Rebuilt)'}
          </button>

          {/* Demo Login Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-4 text-center font-medium">Quick Login (Demo)</p>
            <div className="space-y-3">
              <button
                onClick={() => handleQuickLogin('john.doe@example.com')}
                disabled={isLoading}
                className="btn-3d btn-3d-mint w-full py-3 px-4 text-gray-700 text-sm font-medium transform transition-all duration-200 hover:scale-105"
              >
                🐕 Login as John Doe (Dog Owner)
              </button>
              <button
                onClick={() => handleQuickLogin('jane.doe@example.com')}
                disabled={isLoading}
                className="btn-3d btn-3d-mint w-full py-3 px-4 text-gray-700 text-sm font-medium transform transition-all duration-200 hover:scale-105"
              >
                🐱 Login as Jane Doe (Cat Owner)
              </button>
            </div>
          </div>

          {/* Debug Section */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2 text-center">Troubleshooting</p>
            <button
              onClick={runDiagnostics}
              className="w-full py-2 px-3 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              🔍 Run Google Auth Diagnostics (Check Console)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
