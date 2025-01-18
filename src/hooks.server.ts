import { getUserById, updateUserTokens } from '$db/User.db';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';
import { isTokenExpiring } from '$utils/google';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { OAuth2Client } from 'google-auth-library';

const authentication: Handle = async ({ event, resolve }) => {
	const googleSub = event.cookies.get('session');
	if (googleSub) {
		const user = await getUserById(googleSub);

		if (user) {
			event.locals.user = user;

			if (isTokenExpiring({ expiry_date: user.expiryDate })) {
				const client = new OAuth2Client(
					GOOGLE_CLIENT_ID,
					GOOGLE_CLIENT_SECRET,
					GOOGLE_REDIRECT_URI
				);
				client.setCredentials({
					access_token: user.accessToken,
					refresh_token: user.refreshToken,
					expiry_date: user.expiryDate
				});
				const { credentials } = await client.refreshAccessToken();
				console.log(credentials);
				await updateUserTokens({
					googleId: user.googleId,
					accessToken: credentials.access_token!,
					expiryDate: credentials.expiry_date!,
					refreshToken: credentials.refresh_token || user.refreshToken
				});
				user.accessToken = credentials.access_token!;
				user.refreshToken = credentials.refresh_token
					? credentials.refresh_token
					: user.refreshToken;
				user.expiryDate = credentials.expiry_date!;
			}
		} else {
			event.cookies.delete('session', {
				path: '/'
			});
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event);
};

const authorization: Handle = async ({ event, resolve }) => {
	const googleSub = event.cookies.get('session');
	const protectedRoutes = ['/app'];

	if (protectedRoutes.some((route) => event.url.pathname.startsWith(route))) {
		if (!googleSub) {
			throw redirect(303, '/?error=unauthorized');
		}
	}

	return resolve(event);
};

export const handle = sequence(authentication, authorization);
