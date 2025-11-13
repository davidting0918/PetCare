/**
 * Photo URL Utility
 *
 * Converts relative photo URLs from the database to full URLs
 * using environment-specific base URLs.
 *
 * Static URLs are public and do not require authentication.
 */

/**
 * Gets the base URL based on the current environment
 * @returns The base URL for the current environment
 */
function getBaseUrl(): string {
    const environment = import.meta.env.VITE_APP_ENV;

    if (environment === 'prod') {
        return import.meta.env.VITE_PROD_BASE_URL || '';
    } else if (environment === 'staging') {
        return import.meta.env.VITE_STAGING_BASE_URL || '';
    } else {
        return import.meta.env.VITE_TEST_BASE_URL || '';
    }
}

/**
 * Converts a relative photo URL to a full URL
 *
 * @param relativePath - The relative path from the database (e.g., "/static/pet_photos/a91a9a94.jpg")
 * @returns The full URL, or null if the relative path is invalid/empty
 *
 * @example
 * getPhotoUrl("/static/pet_photos/a91a9a94.jpg")
 * // Returns: "https://api.example.com/static/pet_photos/a91a9a94.jpg"
 */
export function getPhotoUrl(relativePath: string | null | undefined): string | null {
    // Handle null, undefined, or empty strings
    if (!relativePath || relativePath.trim() === '') {
        return null;
    }

    // Get base URL based on environment
    const baseUrl = getBaseUrl();

    // If base URL is not configured, return null
    if (!baseUrl) {
        console.warn('Photo URL utility: Base URL not configured for current environment');
        return null;
    }

    // Remove leading slash from relative path if present (to avoid double slashes)
    const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    // Remove trailing slash from base URL if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Combine base URL with relative path
    return `${cleanBaseUrl}${cleanPath}`;
}
