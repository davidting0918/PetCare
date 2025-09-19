/**
 * API Configuration for External Services
 * Contains environment-based configuration for Google OAuth and other services
 */

export interface GoogleConfig {
  clientId: string;
}

/**
 * Get Google OAuth configuration
 */
export function getGoogleConfig(): GoogleConfig {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
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
