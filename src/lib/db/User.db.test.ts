import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '$db';
import { eq } from 'drizzle-orm';
import { Users } from './schema/User.schema';
import { upsertUser, getUserById, updateUserTokens } from './User.db';
import type { User } from '$types/User.type';

// Mock dependencies
vi.mock('$db', () => ({
	db: {
		insert: vi.fn(),
		selectDistinct: vi.fn(),
		update: vi.fn()
	}
}));

vi.mock('drizzle-orm', () => ({
	eq: vi.fn()
}));

vi.mock('./schema/User.schema', () => ({
	Users: {
		googleId: 'googleId',
		name: 'name',
		email: 'email',
		picture: 'picture',
		accessToken: 'accessToken',
		idToken: 'idToken',
		refreshToken: 'refreshToken',
		expiryDate: 'expiryDate'
	}
}));

vi.mock('$types/User.type', () => ({}));

describe('US-6: Database Operations - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('UT-US6-001: User Data Management', () => {
		it('should upsert new user correctly', async () => {
			const mockUser: User = {
				googleId: 'google_123',
				name: 'John Doe',
				email: 'john@example.com',
				picture: 'https://example.com/picture.jpg',
				idToken: 'id_token_123',
				accessToken: 'access_token_123',
				refreshToken: 'refresh_token_123',
				expiryDate: 1234567890
			};

			// Mock the insert chain
			const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
			const mockValues = vi.fn().mockReturnValue({
				onConflictDoUpdate: mockOnConflictDoUpdate
			});
			const mockInsert = vi.fn().mockReturnValue({
				values: mockValues
			});

			(db.insert as any) = mockInsert;

			await upsertUser(mockUser);

			// Verify insert call
			expect(mockInsert).toHaveBeenCalledWith(Users);

			// Verify values call
			expect(mockValues).toHaveBeenCalledWith({
				name: 'John Doe',
				accessToken: 'access_token_123',
				email: 'john@example.com',
				googleId: 'google_123',
				idToken: 'id_token_123',
				picture: 'https://example.com/picture.jpg',
				expiryDate: 1234567890,
				refreshToken: 'refresh_token_123'
			});

			// Verify onConflictDoUpdate call
			expect(mockOnConflictDoUpdate).toHaveBeenCalledWith({
				target: [Users.googleId],
				set: {
					name: 'John Doe',
					accessToken: 'access_token_123',
					email: 'john@example.com',
					idToken: 'id_token_123',
					picture: 'https://example.com/picture.jpg',
					refreshToken: 'refresh_token_123'
				}
			});
		});

		it('should upsert existing user and update fields', async () => {
			const existingUser: User = {
				googleId: 'google_456',
				name: 'Jane Smith',
				email: 'jane.smith@example.com',
				picture: 'https://example.com/jane.jpg',
				idToken: 'new_id_token_456',
				accessToken: 'new_access_token_456',
				refreshToken: 'new_refresh_token_456',
				expiryDate: 9876543210
			};

			// Mock the insert chain for existing user update
			const mockOnConflictDoUpdate = vi.fn().mockResolvedValue({});
			const mockValues = vi.fn().mockReturnValue({
				onConflictDoUpdate: mockOnConflictDoUpdate
			});
			const mockInsert = vi.fn().mockReturnValue({
				values: mockValues
			});

			(db.insert as any) = mockInsert;

			await upsertUser(existingUser);

			// Verify the conflict resolution updates the existing user
			expect(mockOnConflictDoUpdate).toHaveBeenCalledWith({
				target: [Users.googleId],
				set: {
					name: 'Jane Smith',
					accessToken: 'new_access_token_456',
					email: 'jane.smith@example.com',
					idToken: 'new_id_token_456',
					picture: 'https://example.com/jane.jpg',
					refreshToken: 'new_refresh_token_456'
				}
			});
		});

		it('should retrieve user by ID successfully', async () => {
			const mockUserData = {
				googleId: 'google_789',
				name: 'Test User',
				email: 'test@example.com',
				picture: 'https://example.com/test.jpg',
				accessToken: 'access_token_789',
				refreshToken: 'refresh_token_789',
				expiryDate: 1234567890
			};

			// Mock the select chain
			const mockLimit = vi.fn().mockResolvedValue([mockUserData]);
			const mockWhere = vi.fn().mockReturnValue({
				limit: mockLimit
			});
			const mockFrom = vi.fn().mockReturnValue({
				where: mockWhere
			});
			const mockSelectDistinct = vi.fn().mockReturnValue({
				from: mockFrom
			});

			(db.selectDistinct as any) = mockSelectDistinct;
			(eq as any).mockReturnValue('eq_condition');

			const result = await getUserById('google_789');

			// Verify select chain
			expect(mockSelectDistinct).toHaveBeenCalled();
			expect(mockFrom).toHaveBeenCalledWith(Users);
			expect(eq).toHaveBeenCalledWith(Users.googleId, 'google_789');
			expect(mockWhere).toHaveBeenCalledWith('eq_condition');
			expect(mockLimit).toHaveBeenCalledWith(1);

			// Verify result
			expect(result).toEqual(mockUserData);
		});

		it('should return null when user is not found', async () => {
			// Mock empty result
			const mockLimit = vi.fn().mockResolvedValue([]);
			const mockWhere = vi.fn().mockReturnValue({
				limit: mockLimit
			});
			const mockFrom = vi.fn().mockReturnValue({
				where: mockWhere
			});
			const mockSelectDistinct = vi.fn().mockReturnValue({
				from: mockFrom
			});

			(db.selectDistinct as any) = mockSelectDistinct;
			(eq as any).mockReturnValue('eq_condition');

			const result = await getUserById('nonexistent_user');

			expect(result).toBeNull();
		});

		it('should update user tokens correctly', async () => {
			const tokenUpdate = {
				googleId: 'google_update_123',
				accessToken: 'updated_access_token',
				refreshToken: 'updated_refresh_token',
				expiryDate: 1234567890
			};

			// Mock the update chain
			const mockWhere = vi.fn().mockResolvedValue({});
			const mockSet = vi.fn().mockReturnValue({
				where: mockWhere
			});
			const mockUpdate = vi.fn().mockReturnValue({
				set: mockSet
			});

			(db.update as any) = mockUpdate;
			(eq as any).mockReturnValue('eq_condition');

			await updateUserTokens(tokenUpdate);

			// Verify update chain
			expect(mockUpdate).toHaveBeenCalledWith(Users);
			expect(mockSet).toHaveBeenCalledWith({
				accessToken: 'updated_access_token',
				expiryDate: 1234567890,
				refreshToken: 'updated_refresh_token'
			});
			expect(eq).toHaveBeenCalledWith(Users.googleId, 'google_update_123');
			expect(mockWhere).toHaveBeenCalledWith('eq_condition');
		});

		it('should handle database errors during upsert', async () => {
			const mockUser: User = {
				googleId: 'error_user',
				name: 'Error User',
				email: 'error@example.com',
				picture: '',
				idToken: 'token',
				accessToken: 'access',
				refreshToken: 'refresh',
				expiryDate: 123
			};

			const dbError = new Error('Database connection failed');
			
			// Mock database error
			const mockOnConflictDoUpdate = vi.fn().mockRejectedValue(dbError);
			const mockValues = vi.fn().mockReturnValue({
				onConflictDoUpdate: mockOnConflictDoUpdate
			});
			const mockInsert = vi.fn().mockReturnValue({
				values: mockValues
			});

			(db.insert as any) = mockInsert;

			await expect(upsertUser(mockUser))
				.rejects
				.toThrow('Database connection failed');
		});

		it('should handle database errors during getUserById', async () => {
			const dbError = new Error('Query failed');
			
			// Mock database error
			const mockLimit = vi.fn().mockRejectedValue(dbError);
			const mockWhere = vi.fn().mockReturnValue({
				limit: mockLimit
			});
			const mockFrom = vi.fn().mockReturnValue({
				where: mockWhere
			});
			const mockSelectDistinct = vi.fn().mockReturnValue({
				from: mockFrom
			});

			(db.selectDistinct as any) = mockSelectDistinct;
			(eq as any).mockReturnValue('eq_condition');

			await expect(getUserById('test_user'))
				.rejects
				.toThrow('Query failed');
		});

		it('should handle database errors during updateUserTokens', async () => {
			const tokenUpdate = {
				googleId: 'error_user',
				accessToken: 'access',
				refreshToken: 'refresh',
				expiryDate: 123
			};

			const dbError = new Error('Update failed');
			
			// Mock database error
			const mockWhere = vi.fn().mockRejectedValue(dbError);
			const mockSet = vi.fn().mockReturnValue({
				where: mockWhere
			});
			const mockUpdate = vi.fn().mockReturnValue({
				set: mockSet
			});

			(db.update as any) = mockUpdate;
			(eq as any).mockReturnValue('eq_condition');

			await expect(updateUserTokens(tokenUpdate))
				.rejects
				.toThrow('Update failed');
		});
	});
});
