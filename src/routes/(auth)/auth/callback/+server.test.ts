import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { upsertUser } from '$db/User.db';
import { GET } from './+server';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn()
}));

vi.mock('$db/User.db', () => ({
	upsertUser: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'test_client_id',
	GOOGLE_CLIENT_SECRET: 'test_client_secret',
	GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/callback'
}));

describe('US-2: OAuth Callback Processing - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('UT-US2-001: Token Exchange Processing', () => {
		it('should exchange OAuth code for tokens successfully', async () => {
			// Mock URL with authorization code
			const mockUrl = {
				searchParams: {
					get: vi.fn().mockReturnValue('test_auth_code')
				}
			};

			// Mock OAuth2Client and token response
			const mockTokens = {
				id_token: 'test_id_token',
				access_token: 'test_access_token',
				expiry_date: Date.now() + 3600000,
				refresh_token: 'test_refresh_token'
			};

			const mockClient = {
				getToken: vi.fn().mockResolvedValue({ tokens: mockTokens }),
				setCredentials: vi.fn(),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => ({
						sub: 'test_user_id',
						name: 'Test User',
						email: 'test@example.com',
						picture: 'https://example.com/picture.jpg'
					})
				}),
				credentials: mockTokens
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(upsertUser as any).mockResolvedValue({ id: 'db_user_id' });
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			const mockCookies = {
				set: vi.fn()
			};

			// Execute the callback
			try {
				await GET({ url: mockUrl, cookies: mockCookies } as any);
			} catch (error: any) {
				expect(error.message).toContain('Redirect: 303 /app');
			}

			// Verify token exchange
			expect(mockClient.getToken).toHaveBeenCalledWith('test_auth_code');
			expect(mockClient.setCredentials).toHaveBeenCalledWith(mockTokens);
		});

		it('should verify ID token correctly', async () => {
			const mockUrl = {
				searchParams: {
					get: vi.fn().mockReturnValue('test_code')
				}
			};

			const mockTokens = {
				id_token: 'test_id_token',
				access_token: 'test_access_token',
				expiry_date: Date.now() + 3600000,
				refresh_token: 'test_refresh_token'
			};

			const mockPayload = {
				sub: 'test_user_id',
				name: 'Test User',
				email: 'test@example.com',
				picture: 'https://example.com/picture.jpg'
			};

			const mockClient = {
				getToken: vi.fn().mockResolvedValue({ tokens: mockTokens }),
				setCredentials: vi.fn(),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => mockPayload
				}),
				credentials: mockTokens
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(upsertUser as any).mockResolvedValue({ id: 'db_user_id' });
			(redirect as any).mockImplementation(() => {
				throw new Error('Redirect called');
			});

			try {
				await GET({ url: mockUrl, cookies: { set: vi.fn() } } as any);
			} catch (error) {
				// Expected redirect
			}

			// Verify ID token verification
			expect(mockClient.verifyIdToken).toHaveBeenCalledWith({
				idToken: 'test_id_token',
				audience: 'test_client_id'
			});
		});
	});

	describe('UT-US2-002: User Data Processing', () => {
		it('should upsert user data correctly', async () => {
			const mockUrl = {
				searchParams: {
					get: vi.fn().mockReturnValue('test_code')
				}
			};

			const mockTokens = {
				id_token: 'test_id_token',
				access_token: 'test_access_token',
				expiry_date: 1234567890,
				refresh_token: 'test_refresh_token'
			};

			const mockPayload = {
				sub: 'google_user_123',
				name: 'John Doe',
				email: 'john@example.com',
				picture: 'https://example.com/john.jpg'
			};

			const mockClient = {
				getToken: vi.fn().mockResolvedValue({ tokens: mockTokens }),
				setCredentials: vi.fn(),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => mockPayload
				}),
				credentials: mockTokens
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(upsertUser as any).mockResolvedValue({ id: 'db_user_id' });
			(redirect as any).mockImplementation(() => {
				throw new Error('Redirect called');
			});

			const mockCookies = {
				set: vi.fn()
			};

			try {
				await GET({ url: mockUrl, cookies: mockCookies } as any);
			} catch (error) {
				// Expected redirect
			}

			// Verify user data upsert
			expect(upsertUser).toHaveBeenCalledWith({
				googleId: 'google_user_123',
				name: 'John Doe',
				email: 'john@example.com',
				picture: 'https://example.com/john.jpg',
				idToken: 'test_id_token',
				accessToken: 'test_access_token',
				expiryDate: 1234567890,
				refreshToken: 'test_refresh_token'
			});
		});

		it('should set session cookie and redirect to app', async () => {
			const mockUrl = {
				searchParams: {
					get: vi.fn().mockReturnValue('test_code')
				}
			};

			const mockClient = {
				getToken: vi.fn().mockResolvedValue({ 
					tokens: { 
						id_token: 'token',
						access_token: 'access',
						expiry_date: 123,
						refresh_token: 'refresh'
					} 
				}),
				setCredentials: vi.fn(),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => ({ sub: 'user_123', name: 'Test', email: 'test@test.com' })
				}),
				credentials: { 
					id_token: 'token',
					access_token: 'access',
					expiry_date: 123,
					refresh_token: 'refresh'
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(upsertUser as any).mockResolvedValue({ id: 'db_user_id' });
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			const mockCookies = {
				set: vi.fn()
			};

			try {
				await GET({ url: mockUrl, cookies: mockCookies } as any);
			} catch (error: any) {
				expect(error.message).toContain('Redirect: 303 /app');
			}

			// Verify session cookie
			expect(mockCookies.set).toHaveBeenCalledWith('session', 'user_123', {
				httpOnly: true,
				path: '/',
				secure: false, // NODE_ENV not set to production in tests
				maxAge: 60 * 60 * 24 * 7
			});

			// Verify redirect to app
			expect(redirect).toHaveBeenCalledWith(303, '/app');
		});

		it('should handle missing payload error', async () => {
			const mockUrl = {
				searchParams: {
					get: vi.fn().mockReturnValue('test_code')
				}
			};

			const mockClient = {
				getToken: vi.fn().mockResolvedValue({ tokens: {} }),
				setCredentials: vi.fn(),
				verifyIdToken: vi.fn().mockResolvedValue({
					getPayload: () => null // No payload
				}),
				credentials: {}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			try {
				await GET({ url: mockUrl, cookies: { set: vi.fn() } } as any);
			} catch (error: any) {
				// The actual implementation redirects to the generic error, not the specific payload error
				expect(error.message).toContain('Redirect: 303 /?error=Failed%20to%20authenticate');
			}
		});
	});
});
