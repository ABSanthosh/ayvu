import { error, type RequestHandler } from '@sveltejs/kit';
import { getValidGoogleAccessToken } from '$lib/utils/google-auth';

export const GET: RequestHandler = async ({ params, url, cookies, fetch }) => {
	try {
		// Extract fileId from URL parameters - cast to any to handle dynamic param names
		const fileId = (params as any).fileId as string;
		
		if (!fileId) {
			error(400, 'File ID is required');
		}
		
		// Get a valid access token (will refresh if necessary)
		const accessToken = await getValidGoogleAccessToken(cookies);
		
		if (!accessToken) {
			error(401, 'Authentication required - please log in or re-authenticate');
		}

		// Get size parameter for potential resizing
		const size = url.searchParams.get('sz') || 's4000';
		
		// Use Google Drive API directly to fetch the image
		const driveApiUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
		
		const response = await fetch(driveApiUrl, {
			headers: {
				'Authorization': `Bearer ${accessToken}`,
				'Accept': 'image/*'
			}
		});
		
		if (!response.ok) {
			if (response.status === 404) {
				error(404, 'Image not found');
			} else if (response.status === 403) {
				error(403, 'Access denied - insufficient permissions');
			} else if (response.status === 401) {
				// Token might be expired, try to refresh
				console.log('Access token expired, attempting to refresh...');
				const refreshedToken = await getValidGoogleAccessToken(cookies);
				
				if (refreshedToken && refreshedToken !== accessToken) {
					// Retry with refreshed token
					const retryResponse = await fetch(driveApiUrl, {
						headers: {
							'Authorization': `Bearer ${refreshedToken}`,
							'Accept': 'image/*'
						}
					});
					
					if (retryResponse.ok) {
						const imageBuffer = await retryResponse.arrayBuffer();
						const contentType = retryResponse.headers.get('content-type') || 'image/jpeg';
						
						return new Response(imageBuffer, {
							headers: {
								'Content-Type': contentType,
								'Cache-Control': 'public, max-age=3600',
								'Access-Control-Allow-Origin': '*',
								'Content-Length': imageBuffer.byteLength.toString()
							}
						});
					}
				}
				
				error(401, 'Invalid or expired access token - please re-authenticate');
			} else {
				error(500, `Failed to fetch image: ${response.status} ${response.statusText}`);
			}
		}
		
		// Get the image content type from the response
		const contentType = response.headers.get('content-type') || 'image/jpeg';
		
		// Stream the response directly
		const imageBuffer = await response.arrayBuffer();
		
		return new Response(imageBuffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
				'Access-Control-Allow-Origin': '*',
				'Content-Length': imageBuffer.byteLength.toString()
			}
		});

	} catch (err: any) {
		console.error('Error serving authenticated drive image:', err);
		
		if (err.status) {
			// Re-throw SvelteKit errors
			throw err;
		}
		
		error(500, `Failed to fetch image: ${err.message || 'Unknown error'}`);
	}
};