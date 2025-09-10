import { useState, useCallback } from 'react';
import { authService, type GoogleAuthResponse } from '@/services/authService';

interface UseGoogleAuthReturn {
  loading: boolean;
  error: string | null;
  handleGoogleLogin: () => void;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = useCallback(() => {
    setLoading(true);
    setError(null);

    // Build OAuth URL
    const scope = 'openid profile email';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', `${window.location.origin}/auth/callback`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Open popup window
    const popup = window.open(
      authUrl.toString(),
      'google-oauth',
      'width=500,height=600,resizable=yes,scrollbars=yes,status=yes'
    );

    if (!popup) {
      setError('Unable to open popup window. Please check your popup blocker settings.');
      setLoading(false);
      return;
    }

    // Listen for messages from the popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { code } = event.data;
        
        try {
          const redirectUri = `${window.location.origin}/auth/callback`;
          const result: GoogleAuthResponse = await authService.googleAuth(code, redirectUri);
          
          // Store the access token
          localStorage.setItem('access_token', result.access_token);
          
          // Store user info
          localStorage.setItem('user', JSON.stringify(result.user));

          // Redirect to dashboard
          window.location.href = '/dashboard';
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Google authentication failed');
          console.error('Google auth error:', err);
        } finally {
          setLoading(false);
          popup.close();
          window.removeEventListener('message', handleMessage);
        }
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        setError(event.data.error || 'Google authentication failed');
        setLoading(false);
        popup.close();
        window.removeEventListener('message', handleMessage);
      }
    };

    // Add event listener for popup messages
    window.addEventListener('message', handleMessage);

    // Check if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        setLoading(false);
        setError(null);
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);

  }, []);

  return {
    loading,
    error,
    handleGoogleLogin,
  };
};