/**
 * Photo URL Utility
 *
 * Resolves photo URLs returned by the backend into something the browser
 * can render. After the Cloudinary migration (#69) the backend stores
 * absolute `https://res.cloudinary.com/...` URLs and this helper just
 * passes them through. The legacy `/static/...` relative-path branch is
 * kept as a backstop for any rows in the DB that pre-date the migration
 * (and for local dev environments that have not yet been re-uploaded).
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
 * Resolves a photo URL value from the database into a renderable URL.
 *
 * Behaviour:
 * - Empty / null / undefined input → returns `null`
 * - Absolute URL (starts with `http://` or `https://`) → returned unchanged
 *   (this is the Cloudinary path; the backend stores the full secure URL)
 * - Relative path (e.g. `/static/pet_photos/abc.jpg`) → prefixed with the
 *   environment-specific `VITE_*_BASE_URL` (legacy fallback for any rows
 *   that pre-date the Cloudinary migration in #69)
 *
 * @param relativePath - The value stored in the database
 * @returns The full URL the browser can fetch, or `null` if not resolvable
 *
 * @example
 * // Cloudinary (post-#69)
 * getPhotoUrl("https://res.cloudinary.com/x/image/upload/v1/petcare/pet_photos/abc.jpg")
 * // → "https://res.cloudinary.com/x/image/upload/v1/petcare/pet_photos/abc.jpg"
 *
 * @example
 * // Legacy relative path
 * getPhotoUrl("/static/pet_photos/abc.jpg")
 * // → "https://api.example.com/static/pet_photos/abc.jpg"
 */
export function getPhotoUrl(relativePath: string | null | undefined): string | null {
    // Handle null, undefined, or empty strings
    if (!relativePath || relativePath.trim() === '') {
        return null;
    }

    // Cloudinary (and any other absolute URL) is already renderable as-is.
    // After the backend migration in #69 this is the common path.
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }

    // Legacy fallback: relative path that needs the env base URL prefixed.
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
