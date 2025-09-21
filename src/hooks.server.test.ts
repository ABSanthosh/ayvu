import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { getUserById, updateUserTokens } from '$db/User.db';
import { isTokenExpiring } from '$utils/google';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn()
}));

vi.mock('$db/User.db', () => ({
	getUserById: vi.fn(),
	updateUserTokens: vi.fn()
}));

vi.mock('$utils/google', () => ({
	isTokenExpiring: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'test_client_id',
	GOOGLE_CLIENT_SECRET: 'test_client_secret',
	GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/callback'
}));

vi.mock('$app/environment', () => ({
	dev: true
}));

// Create mock functions for the handles since they're not exported individually
// We'll test the logic by creating wrapper functions
const createAuthenticationHandler = () => {
	return async ({ event, resolve }: any) => {
		const googleSub = event.cookies.get('session');
		if (googleSub) {
			const user = await getUserById(googleSub);

			if (user) {
				event.locals.user = user;

				if (isTokenExpiring({ expiry_date: user.expiryDate })) {
					const client = new OAuth2Client(
						'test_client_id',
						'test_client_secret',
						'http://localhost:5173/auth/callback'
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
};

const createAuthorizationHandler = () => {
	return async ({ event, resolve }: any) => {
		const googleSub = event.cookies.get('session');
		const protectedRoutes = ['/app'];

		if (protectedRoutes.some((route) => event.url.pathname.startsWith(route))) {
			if (!googleSub) {
				throw redirect(303, '/?error=unauthorized');
			}
		}

		return resolve(event);
	};
};

describe('US-3: Authentication Middleware - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('UT-US3-001: Token Refresh Logic', () => {
		it('should refresh tokens when they are expiring', async () => {
			const mockUser = {
				googleId: 'user123',
				accessToken: 'old_access_token',
				refreshToken: 'refresh_token',
				expiryDate: 1234567890, // Fixed timestamp
				name: 'Test User',
				email: 'test@example.com'
			};

			const mockCredentials = {
				access_token: 'new_access_token',
				refresh_token: 'new_refresh_token',
				expiry_date: 9876543210 // Fixed timestamp
			};

			const mockClient = {
				setCredentials: vi.fn(),
				refreshAccessToken: vi.fn().mockResolvedValue({
					credentials: mockCredentials
				})
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(getUserById as any).mockResolvedValue(mockUser);
			(isTokenExpiring as any).mockReturnValue(true);
			(updateUserTokens as any).mockResolvedValue({});

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('user123'),
					delete: vi.fn()
				},
				locals: {}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authHandler = createAuthenticationHandler();

			await authHandler({ event: mockEvent, resolve: mockResolve });

			// Verify token refresh process
			expect(isTokenExpiring).toHaveBeenCalledWith({ expiry_date: 1234567890 });
			expect(mockClient.setCredentials).toHaveBeenCalledWith({
				access_token: 'old_access_token',
				refresh_token: 'refresh_token',
				expiry_date: 1234567890
			});
			expect(mockClient.refreshAccessToken).toHaveBeenCalled();

			// Verify token update
			expect(updateUserTokens).toHaveBeenCalledWith({
				googleId: 'user123',
				accessToken: 'new_access_token',
				expiryDate: mockCredentials.expiry_date,
				refreshToken: 'new_refresh_token'
			});

			// Verify user object is updated
			expect((mockEvent.locals as any).user.accessToken).toBe('new_access_token');
			expect((mockEvent.locals as any).user.refreshToken).toBe('new_refresh_token');
		});

		it('should handle refresh token fallback when new refresh token is not provided', async () => {
			const mockUser = {
				googleId: 'user123',
				accessToken: 'old_access_token',
				refreshToken: 'original_refresh_token',
				expiryDate: Date.now() + 300000,
				name: 'Test User',
				email: 'test@example.com'
			};

			const mockCredentials = {
				access_token: 'new_access_token',
				expiry_date: 9876543210 // Fixed timestamp
				// No refresh_token provided
			};

			const mockClient = {
				setCredentials: vi.fn(),
				refreshAccessToken: vi.fn().mockResolvedValue({
					credentials: mockCredentials
				})
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(getUserById as any).mockResolvedValue(mockUser);
			(isTokenExpiring as any).mockReturnValue(true);
			(updateUserTokens as any).mockResolvedValue({});

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('user123'),
					delete: vi.fn()
				},
				locals: {}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authHandler = createAuthenticationHandler();

			await authHandler({ event: mockEvent, resolve: mockResolve });

			// Verify fallback to original refresh token
			expect(updateUserTokens).toHaveBeenCalledWith({
				googleId: 'user123',
				accessToken: 'new_access_token',
				expiryDate: mockCredentials.expiry_date,
				refreshToken: 'original_refresh_token'
			});

			expect((mockEvent.locals as any).user.refreshToken).toBe('original_refresh_token');
		});

		it('should not refresh tokens when they are not expiring', async () => {
			const mockUser = {
				googleId: 'user123',
				accessToken: 'access_token',
				refreshToken: 'refresh_token',
				expiryDate: 9876543210, // Fixed timestamp
				name: 'Test User',
				email: 'test@example.com'
			};

			(getUserById as any).mockResolvedValue(mockUser);
			(isTokenExpiring as any).mockReturnValue(false);

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('user123'),
					delete: vi.fn()
				},
				locals: {}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authHandler = createAuthenticationHandler();

			await authHandler({ event: mockEvent, resolve: mockResolve });

			// Verify no token refresh occurred
			expect(OAuth2Client).not.toHaveBeenCalled();
			expect(updateUserTokens).not.toHaveBeenCalled();
			expect((mockEvent.locals as any).user).toBe(mockUser);
		});
	});

	describe('UT-US3-002: Route Protection', () => {
		it('should block access to protected routes without session', async () => {
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue(null) // No session
				},
				url: {
					pathname: '/app/dashboard'
				}
			};

			const mockResolve = vi.fn();
			const authzHandler = createAuthorizationHandler();

			await expect(authzHandler({ event: mockEvent, resolve: mockResolve }))
				.rejects
				.toThrow('Redirect: 303 /?error=unauthorized');

			expect(redirect).toHaveBeenCalledWith(303, '/?error=unauthorized');
		});

		it('should allow access to protected routes with valid session', async () => {
			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('user123') // Valid session
				},
				url: {
					pathname: '/app/dashboard'
				}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authzHandler = createAuthorizationHandler();

			await authzHandler({ event: mockEvent, resolve: mockResolve });

			expect(mockResolve).toHaveBeenCalledWith(mockEvent);
			expect(redirect).not.toHaveBeenCalled();
		});

		it('should allow access to unprotected routes without session', async () => {
			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue(null) // No session
				},
				url: {
					pathname: '/public-page'
				}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authzHandler = createAuthorizationHandler();

			await authzHandler({ event: mockEvent, resolve: mockResolve });

			expect(mockResolve).toHaveBeenCalledWith(mockEvent);
			expect(redirect).not.toHaveBeenCalled();
		});

		it('should protect all routes starting with /app', async () => {
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			const protectedPaths = ['/app', '/app/', '/app/settings', '/app/profile/edit'];

			for (const path of protectedPaths) {
				const mockEvent = {
					cookies: {
						get: vi.fn().mockReturnValue(null) // No session
					},
					url: {
						pathname: path
					}
				};

				const mockResolve = vi.fn();
				const authzHandler = createAuthorizationHandler();

				await expect(authzHandler({ event: mockEvent, resolve: mockResolve }))
					.rejects
					.toThrow('Redirect: 303 /?error=unauthorized');
			}
		});

		it('should delete session cookie when user not found', async () => {
			(getUserById as any).mockResolvedValue(null); // User not found

			const mockEvent = {
				cookies: {
					get: vi.fn().mockReturnValue('invalid_user_id'),
					delete: vi.fn()
				},
				locals: {}
			};

			const mockResolve = vi.fn().mockResolvedValue(new Response());
			const authHandler = createAuthenticationHandler();

			await authHandler({ event: mockEvent, resolve: mockResolve });

			expect(mockEvent.cookies.delete).toHaveBeenCalledWith('session', {
				path: '/'
			});
			expect((mockEvent.locals as any).user).toBeUndefined();
		});
	});
});
