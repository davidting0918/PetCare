/**
 * API Configuration
 * Contains environment-based configuration for external services
 */

export interface GoogleConfig {
  clientId: string;
}

/**
 * Get Google OAuth configuration
 */
export function getGoogleConfig(): GoogleConfig {
  console.log('🔧 Loading Google OAuth configuration...')

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  console.log('🔍 Environment check:')
  console.log('  - VITE_GOOGLE_CLIENT_ID exists:', !!clientId)
  console.log('  - VITE_GOOGLE_CLIENT_ID length:', clientId?.length || 0)
  console.log('  - VITE_GOOGLE_CLIENT_ID preview:', clientId ? `${clientId.substring(0, 20)}...` : 'undefined')

  if (!clientId) {
    console.warn('⚠️ VITE_GOOGLE_CLIENT_ID not found in environment variables')
    console.log('🔍 Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')))
    console.log('💡 Make sure you have a .env file with VITE_GOOGLE_CLIENT_ID set')
    return {
      clientId: 'your_google_client_id_here'
    };
  }

  if (clientId === 'your_google_client_id_here') {
    console.error('❌ VITE_GOOGLE_CLIENT_ID is set to placeholder value')
    console.log('💡 Please replace with your actual Google Client ID from Google Cloud Console')
  }

  console.log('✅ Google OAuth configuration loaded successfully')
  return {
    clientId
  };
}

/**
 * Validate Google configuration
 */
export function validateGoogleConfig(): boolean {
  const config = getGoogleConfig();
  return config.clientId !== 'your_google_client_id_here' && config.clientId.length > 0;
}
