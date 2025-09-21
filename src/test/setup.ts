import { vi } from 'vitest';

// Mock environment variables
vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'test_client_id',
	GOOGLE_CLIENT_SECRET: 'test_client_secret',
	GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/callback',
	TURSO_DATABASE_URL: 'file:test.db',
	TURSO_AUTH_TOKEN: 'test_token'
}));

// Mock SvelteKit modules
vi.mock('$app/environment', () => ({
	browser: false,
	dev: true
}));

vi.mock('$app/stores', () => ({
	page: {
		subscribe: vi.fn()
	}
}));

// Global test utilities
global.fetch = vi.fn();
