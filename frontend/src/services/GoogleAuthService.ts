import { getGoogleConfig, validateGoogleConfig } from '../api/config'

// Declare Google API types
declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: any) => void;
          renderButton: (element: Element, config: any) => void;
        };
      };
    };
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
   * Initialize Google Identity Services
   */
  public async initializeGoogle(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise((resolve, reject) => {

      // Validate configuration first
      if (!validateGoogleConfig()) {
        reject(new Error('Invalid Google configuration'))
        return
      }

      // Check if Google Identity Services is already loaded
      if (window.google?.accounts?.id) {
        this.isGoogleLoaded = true
        resolve()
        return
      }

      // Remove any existing script to prevent conflicts
      const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
      if (existingScript) {
        existingScript.remove()
      }

      // Load Google Identity Services script
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true

      script.onload = () => {
        // Give it a moment to initialize
        setTimeout(() => {
          if (window.google?.accounts?.id) {
            this.isGoogleLoaded = true
            resolve()
          } else {
            console.error('❌ Google services not ready after script load')
            reject(new Error('Google Identity Services not ready'))
          }
        }, 200)
      }

      script.onerror = (_error) => {
        console.error('❌ Failed to load Google Identity Services script')
        reject(new Error('Failed to load Google Identity Services - Network Error'))
      }

      document.head.appendChild(script)
    })

    return this.initializationPromise
  }

  /**
   * Authenticate using Google One Tap
   */
  public async authenticateWithButton(options: GoogleAuthOptions): Promise<void> {
    if (!this.isGoogleLoaded) {
      options.onError('Google Identity Services not loaded')
      return
    }

    try {
      // Create a clean callback function
      const authCallback = (response: CredentialResponse) => {
        if (response.credential) {
          options.onSuccess(response.credential)
        } else {
          options.onError('No credential received from Google')
        }
      }

      // Initialize Google Identity Services with clean configuration
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: this.googleConfig.clientId,
          callback: authCallback,
          auto_select: false,
          cancel_on_tap_outside: false,
          // Disable FedCM for now to avoid CORS issues
          use_fedcm_for_prompt: false
        })
      }

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

      // Render Google button
      if (window.google?.accounts?.id) {
        window.google.accounts.id.renderButton(tempContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'signin_with',
          shape: 'rectangular',
          width: 250
        })
      }

      // Wait a moment for button to render, then trigger it
      setTimeout(() => {
        const button = tempContainer.querySelector('div[role="button"]') as HTMLElement
        if (button) {
          button.click()

          // Clean up after a delay
          setTimeout(() => {
            if (document.body.contains(tempContainer)) {
              document.body.removeChild(tempContainer)
            }
          }, 10000) // 10 seconds should be enough
        } else {
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer)
          }
          options.onError('Failed to create Google sign-in button')
        }
      }, 300) // Increased delay to ensure button is ready

    } catch (error) {
      console.error('❌ Critical error in authenticateWithButton:', error)
      options.onError(`Google authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
   * Reset the service
   */
  public reset(): void {
    this.isGoogleLoaded = false
    this.initializationPromise = null

    // Remove existing script
    const existingScript = document.querySelector('script[src*="accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.remove()
    }
  }
}

// Export singleton instance
export const googleAuthService = new GoogleAuthService()
export default googleAuthService
