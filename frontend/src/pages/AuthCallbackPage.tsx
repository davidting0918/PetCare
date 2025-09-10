import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const AuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      // Send error to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error === 'access_denied' ? 'User denied access' : 'OAuth error occurred'
      }, window.location.origin);
      window.close();
      return;
    }

    if (code) {
      // Send authorization code to parent window
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_SUCCESS',
        code: code
      }, window.location.origin);
      window.close();
    } else {
      // No code received
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: 'No authorization code received'
      }, window.location.origin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Processing Authentication...
          </h2>
          <p className="text-gray-400">
            Please wait while we complete your sign-in
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
