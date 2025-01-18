# Setting up Google OAuth with google-auth-library

This guide explains how to implement Google OAuth authentication in your SvelteKit application using the google-auth-library.

## Prerequisites

1. A Google Cloud Console project
2. Get OAuth 2.0 credentials: [Google Docs](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred)
3. SvelteKit application
4. A database setup to persist user data.

## Environment Variables

Create a `.env` file with your Google OAuth credentials:

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:5173/auth/callback"  # Adjust for production
```

## Implementation Steps

### 0.5. Install google library
```bash
npm i google-auth-library
```

### 1. Login Route

Create a route that generates the Google authorization URL and redirects the user. From the user side, we will use a `<form>` to reach this action.

```html
<!--Any svelte component-->
<form hidden action="/auth?/login" method="POST" id="google-login"></form>
<button type="submit" form="google-login">Get Started</button>
```

```typescript
// src/routes/(auth)/auth/+page.server.ts
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';

export const actions: Actions = {
	login: async () => {
		const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
		const url = client.generateAuthUrl({
			access_type: 'offline',
			scope: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile'
			],
			prompt: 'consent'
		});
		throw redirect(302, url);
	},
	logout: async ({ cookies }) => {
		cookies.delete('session', {
			path: '/'
		});
		throw redirect(303, '/');
	}
};
```

### 2. Callback Handler

Create a callback endpoint to handle the OAuth response from Google:

```typescript
// src/routes/callback/+page.server.ts
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';

// Implement these yourself based on your DB and DB interface
import { upsertUser } from '$db/User.db.js';

export async function GET({ url, cookies }) {
	const code = url.searchParams.get('code');

	try {
		const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
		const response = await client.getToken(code!);

		client.setCredentials(response.tokens);
		const payload = (
			await client.verifyIdToken({
				idToken: client.credentials.id_token!,
				audience: GOOGLE_CLIENT_ID
			})
		).getPayload();

		if (payload) {
			// Do What you want with the user data but to persist it, you should store these data.
			// const dbUser = await upsertUser({
			// 	googleId: payload.sub,
			// 	name: payload.name || '',
			// 	email: payload.email || '',
			// 	picture: payload.picture || '',
			// 	idToken: client.credentials.id_token!,          <===Mandatory
			// 	accessToken: client.credentials.access_token!,  <===Mandatory
			// 	expiryDate: client.credentials.expiry_date!,    <===Mandatory
			// 	refreshToken: client.credentials.refresh_token! <===Mandatory
			// });
		} else {
			throw redirect(303, '/?error=No%20payload%20found');
		}

		cookies.set('session', payload.sub, {
			httpOnly: true, // Ensure this cookie cannot be accessed via client-side JavaScript
			path: '/',
			secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
			maxAge: 60 * 60 * 24 * 7 // 1 week expiration
		});
	} catch (error) {
		console.error(error);
		return redirect(303, '/?error=Failed%20to%20authenticate');
	}

	// You can redirect to your protected route or do what you want
	return redirect(303, '/app');
}
```

### 3. Authentication Middleware

Set up the authentication middleware in hooks.server.ts:

```typescript
// src/hooks.server.ts
import { sequence } from '@sveltejs/kit/hooks';
import { OAuth2Client } from 'google-auth-library';
import { redirect, type Handle } from '@sveltejs/kit';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';

// Implement these yourself based on your DB and DB interface
import { getUserById, updateUserTokens } from '$db/User.db';

/**
 * This function is based on client.isTokenExpiring() from
 * google library but for some reason, the function is private
 * You can find the function code here
 * https://github.com/googleapis/google-auth-library-nodejs/blob/12f2c87266de0a3ccd33e6b4993cab3537f9a242/src/auth/oauth2client.ts#L1548
*/
function isTokenExpiring({
	eagerRefreshThresholdMillis = 2000,
	expiry_date
}: {
	eagerRefreshThresholdMillis?: number;
	expiry_date: number;
}) {
	const now = new Date().getTime();
	return expiry_date ? now >= expiry_date - eagerRefreshThresholdMillis : false;
}

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
	// Optional: If you wish to have protected routes.
	// const googleSub = event.cookies.get('session');
	// const protectedRoutes = ['/app'];

	// if (protectedRoutes.some((route) => event.url.pathname.startsWith(route))) {
	// 	if (!googleSub) {
	// 		throw redirect(303, '/?error=unauthorized');
	// 	}
	// }

	return resolve(event);
};

export const handle = sequence(authentication, authorization);
```

### 4. Database Interface

Example of required database functions:

```typescript
// src/lib/db.ts
interface User {
	googleId: string;
	name: string;
	email: string;
	picture: string;
	idToken: string;
	accessToken: string;
	refreshToken: string;
}

export async function upsertUser(userData: User) {
	// Implement your database logic here
	// Should create or update user based on googleId
}

export async function getUserById(googleId: string) {
	// Implement your database logic here
	// Should return user data or null
}
```


<!--
Mermaid code for flow

sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant G as Google
    participant DB as Database

    U->>F: Click Login Button
    F->>B: Request Google Auth URL
    Note over B: Create OAuth2Client<br/>Generate Auth URL
    B->>U: Redirect to Google Login
    U->>G: Authenticate & Grant Permissions
    G->>B: Redirect to /callback with code
    
    Note over B: Get tokens using code
    B->>G: Exchange code for tokens
    G->>B: Return tokens & user info
    
    Note over B: Verify ID token
    B->>DB: Save user & tokens
    B->>B: Set session cookie
    B->>F: Redirect to app
    
    rect rgb(200, 200, 200)
        Note over U,DB: On subsequent requests
        U->>B: Make request with cookie
        B->>DB: Verify session & get user
        DB->>B: Return user data
        B->>B: Set locals.user
        B->>U: Continue with request
    end

 -->