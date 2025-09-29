import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { eq } from 'drizzle-orm';
import { Users } from '../schema/User.schema';
import type { User } from '$lib/types/User.type';
import fs from 'fs';
import path from 'path';

// Create test database instance
const testDbPath = ':memory:'; // Use in-memory database for tests
const testClient = createClient({ url: testDbPath });
const testDb = drizzle(testClient);

// Mock the database module to use our test database
vi.mock('$lib/db', () => ({
	db: testDb
}));

// Import functions after mocking
const { upsertUser, getUserById, updateUserTokens } = await import('../User.db');

describe('User Database Operations', () => {
	beforeEach(async () => {
		// Create the users table for each test
		await testDb.run(`
			CREATE TABLE IF NOT EXISTS users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				googleId TEXT UNIQUE NOT NULL,
				email TEXT UNIQUE NOT NULL,
				name TEXT NOT NULL,
				picture TEXT,
				accessToken TEXT NOT NULL,
				refreshToken TEXT NOT NULL,
				idToken TEXT NOT NULL,
				expiryDate INTEGER NOT NULL,
				timestamp TEXT DEFAULT (current_timestamp) NOT NULL
			)
		`);
	});

	afterEach(async () => {
		// Clean up after each test
		await testDb.run('DROP TABLE IF EXISTS users');
	});

	describe('upsertUser', () => {
		const mockUser: User = {
			googleId: 'google123',
			email: 'test@example.com',
			name: 'Test User',
			picture: 'https://example.com/avatar.jpg',
			accessToken: 'access-token-123',
			refreshToken: 'refresh-token-123',
			idToken: 'id-token-123',
			expiryDate: Date.now() + 3600000 // 1 hour from now
		};

		it('should create a new user successfully', async () => {
			await upsertUser(mockUser);

			const user = await testDb.select().from(Users).where(eq(Users.googleId, mockUser.googleId));
			expect(user).toHaveLength(1);
			expect(user[0]).toMatchObject({
				googleId: mockUser.googleId,
				email: mockUser.email,
				name: mockUser.name,
				picture: mockUser.picture,
				accessToken: mockUser.accessToken,
				refreshToken: mockUser.refreshToken,
				idToken: mockUser.idToken,
				expiryDate: mockUser.expiryDate
			});
		});

		it('should update existing user on conflict', async () => {
			// First insert
			await upsertUser(mockUser);

			// Update with new data
			const updatedUser: User = {
				...mockUser,
				name: 'Updated Name',
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				idToken: 'new-id-token'
			};

			await upsertUser(updatedUser);

			const users = await testDb.select().from(Users).where(eq(Users.googleId, mockUser.googleId));
			expect(users).toHaveLength(1);
			expect(users[0].name).toBe('Updated Name');
			expect(users[0].accessToken).toBe('new-access-token');
			expect(users[0].refreshToken).toBe('new-refresh-token');
			expect(users[0].idToken).toBe('new-id-token');
		});

		it('should handle user without picture', async () => {
			const userWithoutPicture: User = {
				...mockUser,
				picture: null
			};

			await upsertUser(userWithoutPicture);

			const user = await testDb.select().from(Users).where(eq(Users.googleId, mockUser.googleId));
			expect(user).toHaveLength(1);
			expect(user[0].picture).toBeNull();
		});
	});

	describe('getUserById', () => {
		const mockUser: User = {
			googleId: 'google123',
			email: 'test@example.com',
			name: 'Test User',
			picture: 'https://example.com/avatar.jpg',
			accessToken: 'access-token-123',
			refreshToken: 'refresh-token-123',
			idToken: 'id-token-123',
			expiryDate: Date.now() + 3600000
		};

		it('should return user when found', async () => {
			await upsertUser(mockUser);

			const result = await getUserById(mockUser.googleId);

			expect(result).not.toBeNull();
			expect(result!.googleId).toBe(mockUser.googleId);
			expect(result!.email).toBe(mockUser.email);
			expect(result!.name).toBe(mockUser.name);
		});

		it('should return null when user not found', async () => {
			const result = await getUserById('nonexistent-id');
			expect(result).toBeNull();
		});

		it('should return only one user even if multiple match somehow', async () => {
			await upsertUser(mockUser);

			const result = await getUserById(mockUser.googleId);
			expect(result).not.toBeNull();
			expect(typeof result).toBe('object');
		});
	});

	describe('updateUserTokens', () => {
		const mockUser: User = {
			googleId: 'google123',
			email: 'test@example.com',
			name: 'Test User',
			picture: 'https://example.com/avatar.jpg',
			accessToken: 'old-access-token',
			refreshToken: 'old-refresh-token',
			idToken: 'old-id-token',
			expiryDate: Date.now() + 1800000 // 30 minutes
		};

		beforeEach(async () => {
			await upsertUser(mockUser);
		});

		it('should update user tokens successfully', async () => {
			const newTokenData = {
				googleId: mockUser.googleId,
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiryDate: Date.now() + 3600000 // 1 hour
			};

			await updateUserTokens(newTokenData);

			const updatedUser = await testDb.select().from(Users).where(eq(Users.googleId, mockUser.googleId));
			expect(updatedUser).toHaveLength(1);
			expect(updatedUser[0].accessToken).toBe(newTokenData.accessToken);
			expect(updatedUser[0].refreshToken).toBe(newTokenData.refreshToken);
			expect(updatedUser[0].expiryDate).toBe(newTokenData.expiryDate);
		});

		it('should not affect other user fields', async () => {
			const newTokenData = {
				googleId: mockUser.googleId,
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiryDate: Date.now() + 3600000
			};

			await updateUserTokens(newTokenData);

			const updatedUser = await testDb.select().from(Users).where(eq(Users.googleId, mockUser.googleId));
			expect(updatedUser[0].name).toBe(mockUser.name);
			expect(updatedUser[0].email).toBe(mockUser.email);
			expect(updatedUser[0].picture).toBe(mockUser.picture);
		});

		it('should return update result', async () => {
			const newTokenData = {
				googleId: mockUser.googleId,
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiryDate: Date.now() + 3600000
			};

			const result = await updateUserTokens(newTokenData);
			expect(result).toBeDefined();
		});

		it('should handle non-existent user gracefully', async () => {
			const newTokenData = {
				googleId: 'nonexistent-user',
				accessToken: 'new-access-token',
				refreshToken: 'new-refresh-token',
				expiryDate: Date.now() + 3600000
			};

			// Should not throw an error
			await expect(updateUserTokens(newTokenData)).resolves.toBeDefined();
		});
	});
});