import React from 'react';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import GoogleIcon from '@/components/icons/GoogleIcon';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const LoginPage: React.FC = () => {
  const { loading, error, handleGoogleLogin } = useGoogleAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl"></div>
      </div>

      <div className="relative max-w-md w-full">
        {/* Logo and Welcome */}
        <div className="text-center mb-8">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              🐾 PetCare
            </h1>
            <p className="text-gray-300 text-lg">
              Track your pet's health & happiness
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-400">
              Sign in to continue to your pet dashboard
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">or</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Alternative Login Options */}
          <div className="space-y-3">
            <button className="w-full py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700/30 transition-colors duration-200">
              <span className="text-sm">Continue as Guest</span>
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-gray-500 text-xs mt-6">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-blue-400 hover:text-blue-300 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            New to PetCare?{' '}
            <span className="text-blue-400 font-medium">
              Your account will be created automatically
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
