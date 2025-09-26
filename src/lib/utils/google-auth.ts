import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';
import type { Cookies } from '@sveltejs/kit';

/**
 * Refreshes Google access token using the refresh token
 * @param cookies - SvelteKit cookies object
 * @returns Promise<string | null> - New access token or null if failed
 */
export async function refreshGoogleAccessToken(cookies: Cookies): Promise<string | null> {
	try {
		const refreshToken = cookies.get('google_refresh_token');
		
		if (!refreshToken) {
			console.warn('No refresh token available');
			return null;
		}

		const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
		client.setCredentials({ refresh_token: refreshToken });

		// Get new access token
		const { credentials } = await client.refreshAccessToken();
		
		if (credentials.access_token) {
			// Update the access token cookie
			cookies.set('google_access_token', credentials.access_token, {
				httpOnly: true,
				path: '/',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 3600 // 1 hour
			});

			// Update refresh token if a new one was provided
			if (credentials.refresh_token) {
				cookies.set('google_refresh_token', credentials.refresh_token, {
					httpOnly: true,
					path: '/',
					secure: process.env.NODE_ENV === 'production',
					maxAge: 60 * 60 * 24 * 30 // 30 days
				});
			}

			return credentials.access_token;
		}

		return null;
	} catch (error) {
		console.error('Failed to refresh Google access token:', error);
		return null;
	}
}

/**
 * Gets a valid Google access token, refreshing if necessary
 * @param cookies - SvelteKit cookies object
 * @returns Promise<string | null> - Valid access token or null if failed
 */
export async function getValidGoogleAccessToken(cookies: Cookies): Promise<string | null> {
	const accessToken = cookies.get('google_access_token');
	
	// If we have an access token, try to use it first
	if (accessToken) {
		return accessToken;
	}

	// If no access token, try to refresh
	console.log('No access token found, attempting to refresh...');
	return await refreshGoogleAccessToken(cookies);
}

/**
 * Checks if the current access token is expired or about to expire
 * @param cookies - SvelteKit cookies object
 * @param bufferMinutes - Minutes before expiry to consider token as expired (default: 5)
 * @returns boolean - true if token needs refresh
 */
export function shouldRefreshAccessToken(cookies: Cookies, bufferMinutes = 5): boolean {
	const accessToken = cookies.get('google_access_token');
	
	if (!accessToken) {
		return true; // No token, definitely needs refresh
	}

	// Since we can't easily determine token expiry from the token itself,
	// we rely on cookie expiry or implement additional token metadata storage
	// For now, we'll assume tokens need refresh if they're missing
	return false; // Cookie-based expiry will handle this
}

/**
 * Clears all Google authentication cookies
 * @param cookies - SvelteKit cookies object
 */
export function clearGoogleAuthCookies(cookies: Cookies): void {
	cookies.delete('google_access_token', { path: '/' });
	cookies.delete('google_refresh_token', { path: '/' });
	cookies.delete('session', { path: '/' });
}