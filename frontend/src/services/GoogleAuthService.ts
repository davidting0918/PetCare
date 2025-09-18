/**
 * Rebuilt Google OAuth Authentication Service
 * Simple, reliable implementation focused on stability and token logging
 */

import { getGoogleConfig, validateGoogleConfig } from '../api/config'

// Simplified Google Identity Services types
declare global {
  interface Window {
    google: any
    onGoogleLibraryLoad: () => void
  }
}

export interface CredentialResponse {
  credential: string
  select_by: string
  clientId?: string
}

export interface GoogleAuthOptions {
  onSuccess: (credential: string) => void
  onError: (error: string) => void
}

export class GoogleAuthService {
  private isGoogleLoaded = false
  private googleConfig = getGoogleConfig()
  private initializationPromise: Promise<void> | null = null

  /**
   * Initialize Google Identity Services - Rebuilt for reliability
   */
  public async initializeGoogle(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {
      console.log('🔄 [REBUILT] Initializing Google Identity Services...')
      console.log('🔧 Client ID:', this.googleConfig.clientId.substring(0, 20) + '...')
      console.log('🌐 Current URL:', window.location.origin)

      // Validate configuration first
      if (!validateGoogleConfig()) {
        reject(new Error('Invalid Google configuration'))
        return
      }

      // Check if Google Identity Services is already loaded
      if (window.google?.accounts?.id) {
        this.isGoogleLoaded = true
        console.log('✅ Google Identity Services already loaded')
        resolve()
        return
      }

      // Remove any existing script to prevent conflicts
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existingScript) {
        console.log('🔄 Removing existing Google script...')
        existingScript.remove()
      }

      // Load Google Identity Services script
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true

      script.onload = () => {
        console.log('📦 Google script loaded, checking availability...')

        // Give it a moment to initialize
        setTimeout(() => {
          if (window.google?.accounts?.id) {
            this.isGoogleLoaded = true
            console.log('✅ Google Identity Services ready')
            resolve()
          } else {
            console.error('❌ Google services not ready after script load')
            reject(new Error('Google Identity Services not ready'))
          }
        }, 200)
      }

      script.onerror = (error) => {
        console.error('❌ Failed to load Google Identity Services script')
        console.error('📋 Network error details:', error)
        reject(new Error('Failed to load Google Identity Services - Network Error'))
      }

      console.log('📡 Loading Google Identity Services script...')
      document.head.appendChild(script)
    })

    return this.initializationPromise
  }

  /**
   * Simple button-based Google authentication - Most reliable method
   */
  public async authenticateWithButton(options: GoogleAuthOptions): Promise<void> {
    console.log('🚀 [REBUILT] Starting button-based Google authentication...')

    if (!this.isGoogleLoaded) {
      console.error('❌ Google Identity Services not loaded')
      options.onError('Google Identity Services not loaded')
      return
    }

    try {
      console.log('🔧 Setting up Google authentication callback...')

      // Create a clean callback function
      const authCallback = (response: CredentialResponse) => {
        console.log('🎉 [TOKEN] Google authentication callback triggered!')
        console.log('📋 [TOKEN] Response received:', {
          hasCredential: !!response.credential,
          credentialLength: response.credential?.length || 0,
          selectBy: response.select_by,
          clientId: response.clientId
        })

        if (response.credential) {
          this.logTokenDetails(response.credential)
          console.log('✅ [TOKEN] Calling success callback...')
          options.onSuccess(response.credential)
        } else {
          console.error('❌ [TOKEN] No credential in response')
          console.log('🔍 [TOKEN] Full response:', response)
          options.onError('No credential received from Google')
        }
      }

      // Initialize Google Identity Services with clean configuration
      console.log('🔧 Initializing Google Identity Services...')
      window.google.accounts.id.initialize({
        client_id: this.googleConfig.clientId,
        callback: authCallback,
        auto_select: false,
        cancel_on_tap_outside: false,
        // Disable FedCM for now to avoid CORS issues
        use_fedcm_for_prompt: false
      })

      console.log('✅ Google Identity Services initialized')

      // Create a temporary invisible button
      const tempContainer = document.createElement('div')
      tempContainer.id = 'google-signin-temp-' + Date.now()
      tempContainer.style.position = 'fixed'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.visibility = 'hidden'
      tempContainer.style.pointerEvents = 'none'
      tempContainer.style.zIndex = '-1'
      document.body.appendChild(tempContainer)

      console.log('🔧 Creating invisible Google button...')

      // Render Google button
      window.google.accounts.id.renderButton(tempContainer, {
        theme: 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        width: 250
      })

      console.log('✅ Google button created, triggering authentication...')

      // Wait a moment for button to render, then trigger it
      setTimeout(() => {
        const button = tempContainer.querySelector('div[role="button"]') as HTMLElement
        if (button) {
          console.log('🖱️ Programmatically clicking Google button...')
          button.click()

          // Clean up after a delay
          setTimeout(() => {
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer)
              console.log('🧹 Cleaned up temporary button')
            }
          }, 10000) // 10 seconds should be enough
        } else {
          console.error('❌ Could not find Google button to click')
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer)
          }
          options.onError('Failed to create Google sign-in button')
        }
      }, 300) // Increased delay to ensure button is ready

    } catch (error) {
      console.error('❌ Critical error in authenticateWithButton:', error)
      console.error('📋 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      })
      options.onError(`Google authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Log detailed token information as requested
   */
  private logTokenDetails(credential: string): void {
    try {
      console.log('🔍 [TOKEN] ===== DETAILED TOKEN ANALYSIS =====')
      console.log('🔍 [TOKEN] Raw credential length:', credential.length)
      console.log('🔍 [TOKEN] Raw credential (first 100 chars):', credential.substring(0, 100) + '...')
      console.log('🔍 [TOKEN] Raw credential (last 50 chars):', '...' + credential.substring(credential.length - 50))

      // Parse JWT
      const parts = credential.split('.')
      console.log('🔍 [TOKEN] JWT parts count:', parts.length)

      if (parts.length === 3) {
        console.log('🔍 [TOKEN] JWT Header length:', parts[0].length)
        console.log('🔍 [TOKEN] JWT Payload length:', parts[1].length)
        console.log('🔍 [TOKEN] JWT Signature length:', parts[2].length)

        try {
          // Decode header
          const header = JSON.parse(atob(parts[0]))
          console.log('🔍 [TOKEN] JWT Header:', header)

          // Decode payload
          const payload = JSON.parse(atob(parts[1]))
          console.log('🔍 [TOKEN] JWT Payload (Full):', payload)
          console.log('🔍 [TOKEN] JWT Payload (Structured):', {
            // Identity fields
            iss: payload.iss,
            aud: payload.aud,
            sub: payload.sub,

            // User info
            email: payload.email,
            email_verified: payload.email_verified,
            name: payload.name,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
            locale: payload.locale,

            // Token timing
            iat: payload.iat,
            exp: payload.exp,
            nbf: payload.nbf,
            iat_readable: new Date(payload.iat * 1000).toISOString(),
            exp_readable: new Date(payload.exp * 1000).toISOString(),
            nbf_readable: payload.nbf ? new Date(payload.nbf * 1000).toISOString() : 'N/A',

            // Additional fields
            azp: payload.azp,
            at_hash: payload.at_hash,
            hd: payload.hd
          })

          // Token validity
          const now = Date.now()
          const expiry = payload.exp * 1000
          const minutesUntilExpiry = Math.round((expiry - now) / 1000 / 60)

          console.log('🔍 [TOKEN] Token Timing Analysis:')
          console.log('  - Current time:', new Date().toISOString())
          console.log('  - Token issued at:', new Date(payload.iat * 1000).toISOString())
          console.log('  - Token expires at:', new Date(expiry).toISOString())
          console.log('  - Minutes until expiry:', minutesUntilExpiry)
          console.log('  - Token is valid:', expiry > now)

          if (payload.nbf) {
            console.log('  - Token valid from:', new Date(payload.nbf * 1000).toISOString())
            console.log('  - Token is active:', payload.nbf * 1000 <= now)
          }

        } catch (parseError) {
          console.error('❌ [TOKEN] Error parsing JWT parts:', parseError)
        }
      } else {
        console.error('❌ [TOKEN] Invalid JWT format - expected 3 parts, got:', parts.length)
      }

      console.log('🔍 [TOKEN] ===== END DETAILED TOKEN ANALYSIS =====')

    } catch (error) {
      console.error('❌ [TOKEN] Error analyzing token:', error)
    }
  }

  /**
   * Check if Google Identity Services is loaded
   */
  public isLoaded(): boolean {
    return this.isGoogleLoaded && !!window.google?.accounts?.id
  }

  /**
   * Get Google Client ID
   */
  public getClientId(): string {
    return this.googleConfig.clientId
  }

  /**
   * Reset the service (for debugging)
   */
  public reset(): void {
    console.log('🔄 Resetting Google Auth Service...')
    this.isGoogleLoaded = false
    this.initializationPromise = null

    // Remove existing script
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.remove()
      console.log('🧹 Removed existing Google script')
    }

    console.log('✅ Google Auth Service reset complete')
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService()
export default googleAuthService
