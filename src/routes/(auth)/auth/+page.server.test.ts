import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { actions } from './+page.server';

// Mock dependencies
vi.mock('@sveltejs/kit', () => ({
	redirect: vi.fn()
}));

vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn()
}));

vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'test_client_id',
	GOOGLE_CLIENT_SECRET: 'test_client_secret',
	GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/callback'
}));

describe('US-1: Sign in with Google - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('UT-US1-001: OAuth URL Generation', () => {
		it('should generate OAuth URL with correct scopes', async () => {
			// Mock OAuth2Client methods
			const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://accounts.google.com/oauth/authorize?test=url');
			const mockOAuth2Client = {
				generateAuthUrl: mockGenerateAuthUrl
			};
			
			(OAuth2Client as any).mockImplementation(() => mockOAuth2Client);
			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			// Test the login action
			try {
				await actions.login({} as any);
			} catch (error: any) {
				expect(error.message).toContain('Redirect: 302');
			}

			// Verify OAuth2Client was initialized with correct parameters
			expect(OAuth2Client).toHaveBeenCalledWith(
				'test_client_id',
				'test_client_secret',
				'http://localhost:5173/auth/callback'
			);

			// Verify generateAuthUrl was called with correct scopes
			expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
				access_type: 'offline',
				scope: [
					'https://www.googleapis.com/auth/userinfo.email',
					'https://www.googleapis.com/auth/userinfo.profile',
					'https://www.googleapis.com/auth/drive.file'
				],
				prompt: 'consent'
			});

			// Verify redirect was called with 302 status
			expect(redirect).toHaveBeenCalledWith(302, 'https://accounts.google.com/oauth/authorize?test=url');
		});

		it('should include Drive file scope for permissions', async () => {
			const mockGenerateAuthUrl = vi.fn().mockReturnValue('https://test.url');
			const mockOAuth2Client = {
				generateAuthUrl: mockGenerateAuthUrl
			};
			
			(OAuth2Client as any).mockImplementation(() => mockOAuth2Client);
			(redirect as any).mockImplementation(() => {
				throw new Error('Redirect called');
			});

			try {
				await actions.login({} as any);
			} catch (error) {
				// Expected redirect error
			}

			const callArgs = mockGenerateAuthUrl.mock.calls[0][0];
			expect(callArgs.scope).toContain('https://www.googleapis.com/auth/drive.file');
		});
	});

	describe('UT-US1-002: Session Cookie Management', () => {
		it('should delete session cookie and redirect on logout', async () => {
			const mockCookies = {
				delete: vi.fn()
			};

			(redirect as any).mockImplementation((status: number, url: string) => {
				throw new Error(`Redirect: ${status} ${url}`);
			});

			try {
				await actions.logout({ cookies: mockCookies } as any);
			} catch (error: any) {
				expect(error.message).toContain('Redirect: 303 /');
			}

			// Verify cookie deletion
			expect(mockCookies.delete).toHaveBeenCalledWith('session', {
				path: '/'
			});

			// Verify redirect to home page
			expect(redirect).toHaveBeenCalledWith(303, '/');
		});

		it('should set cookie path to root', async () => {
			const mockCookies = {
				delete: vi.fn()
			};

			(redirect as any).mockImplementation(() => {
				throw new Error('Redirect called');
			});

			try {
				await actions.logout({ cookies: mockCookies } as any);
			} catch (error) {
				// Expected redirect error
			}

			const deleteCall = mockCookies.delete.mock.calls[0];
			expect(deleteCall[1]).toEqual({ path: '/' });
		});
	});
});
