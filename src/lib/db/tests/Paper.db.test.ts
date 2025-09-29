import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { eq, and } from 'drizzle-orm';
import { Paper } from '../schema/Paper.schema';
import type { PaperData } from '../Paper.db';

// Create test database instance
const testDbPath = ':memory:'; // Use in-memory database for tests
const testClient = createClient({ url: testDbPath });
const testDb = drizzle(testClient);

// Mock the database module to use our test database
vi.mock('$lib/db', () => ({
	db: testDb
}));

// Import functions after mocking
const {
	createPaper,
	getAllPapers,
	getPapersByUserId,
	getPaperById,
	getPaperByArxivId,
	getPaperByArxivIdAndUserId,
	updatePaper,
	deletePaper
} = await import('../Paper.db');

describe('Paper Database Operations', () => {
	beforeEach(async () => {
		// Create the papers table for each test
		await testDb.run(`
			CREATE TABLE IF NOT EXISTS papers (
				id TEXT PRIMARY KEY NOT NULL,
				title TEXT NOT NULL,
				abstract TEXT NOT NULL,
				authors TEXT NOT NULL,
				publishedOn TEXT NOT NULL,
				arxivId TEXT,
				arxivUrl TEXT,
				userId TEXT NOT NULL
			)
		`);
	});

	afterEach(async () => {
		// Clean up after each test
		await testDb.run('DROP TABLE IF EXISTS papers');
	});

	const mockPaperData: PaperData = {
		id: 'paper-123',
		title: 'Test Paper Title',
		abstract: 'This is a test abstract for the paper. It contains important research findings.',
		authors: ['John Doe', 'Jane Smith'],
		publishedOn: '2024-01-15',
		arxivId: 'arxiv-456',
		arxivUrl: 'https://arxiv.org/abs/arxiv-456',
		userId: 'user-123'
	};

	describe('createPaper', () => {
		it('should create a new paper successfully', async () => {
			const result = await createPaper(mockPaperData);
			expect(result).toBeDefined();

			// Verify paper was created
			const papers = await testDb.select().from(Paper).where(eq(Paper.id, mockPaperData.id));
			expect(papers).toHaveLength(1);
			expect(papers[0]).toMatchObject({
				id: mockPaperData.id,
				title: mockPaperData.title,
				abstract: mockPaperData.abstract,
				authors: JSON.stringify(mockPaperData.authors),
				publishedOn: mockPaperData.publishedOn,
				arxivId: mockPaperData.arxivId,
				arxivUrl: mockPaperData.arxivUrl,
				userId: mockPaperData.userId
			});
		});

		it('should create paper without optional fields', async () => {
			const paperWithoutOptional: PaperData = {
				...mockPaperData,
				arxivId: undefined,
				arxivUrl: undefined
			};

			await createPaper(paperWithoutOptional);

			const papers = await testDb.select().from(Paper).where(eq(Paper.id, mockPaperData.id));
			expect(papers).toHaveLength(1);
			expect(papers[0].arxivId).toBeNull();
			expect(papers[0].arxivUrl).toBeNull();
		});

		it('should handle authors array correctly', async () => {
			const multiAuthorPaper: PaperData = {
				...mockPaperData,
				authors: ['Author One', 'Author Two', 'Author Three']
			};

			await createPaper(multiAuthorPaper);

			const papers = await testDb.select().from(Paper).where(eq(Paper.id, mockPaperData.id));
			expect(papers[0].authors).toBe(JSON.stringify(multiAuthorPaper.authors));
		});
	});

	describe('getAllPapers', () => {
		beforeEach(async () => {
			// Create test papers
			await createPaper(mockPaperData);
			await createPaper({
				...mockPaperData,
				id: 'paper-456',
				title: 'Another Test Paper',
				userId: 'user-456'
			});
		});

		it('should return all papers with correct format', async () => {
			const papers = await getAllPapers();

			expect(papers).toHaveLength(2);
			expect(papers[0]).toMatchObject({
				id: expect.any(String),
				title: expect.any(String),
				authors: expect.any(Array),
				published: expect.any(String),
				abstract: expect.any(String),
				userId: expect.any(String),
				preview: 'src'
			});
		});

		it('should parse authors JSON correctly', async () => {
			const papers = await getAllPapers();
			const firstPaper = papers.find(p => p.id === mockPaperData.id);

			expect(firstPaper?.authors).toEqual(mockPaperData.authors);
		});

		it('should return empty array when no papers exist', async () => {
			// Clear all papers
			await testDb.run('DELETE FROM papers');

			const papers = await getAllPapers();
			expect(papers).toHaveLength(0);
		});
	});

	describe('getPapersByUserId', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
			await createPaper({
				...mockPaperData,
				id: 'paper-456',
				title: 'User 123 Paper 2',
				userId: 'user-123' // Same user
			});
			await createPaper({
				...mockPaperData,
				id: 'paper-789',
				title: 'Different User Paper',
				userId: 'user-different'
			});
		});

		it('should return papers for specific user only', async () => {
			const userPapers = await getPapersByUserId('user-123');

			expect(userPapers).toHaveLength(2);
			userPapers.forEach(paper => {
				expect(paper.userId).toBe('user-123');
			});
		});

		it('should return empty array for user with no papers', async () => {
			const userPapers = await getPapersByUserId('nonexistent-user');
			expect(userPapers).toHaveLength(0);
		});
	});

	describe('getPaperById', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
		});

		it('should return paper when found', async () => {
			const paper = await getPaperById(mockPaperData.id);

			expect(paper).not.toBeNull();
			expect(paper!.id).toBe(mockPaperData.id);
			expect(paper!.title).toBe(mockPaperData.title);
			expect(paper!.authors).toEqual(mockPaperData.authors);
		});

		it('should return null when paper not found', async () => {
			const paper = await getPaperById('nonexistent-id');
			expect(paper).toBeNull();
		});
	});

	describe('getPaperByArxivId', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
		});

		it('should return paper when found by arxiv ID', async () => {
			const paper = await getPaperByArxivId(mockPaperData.arxivId!);

			expect(paper).not.toBeNull();
			expect(paper!.arxivId).toBe(mockPaperData.arxivId);
			expect(paper!.title).toBe(mockPaperData.title);
		});

		it('should return null when paper not found by arxiv ID', async () => {
			const paper = await getPaperByArxivId('nonexistent-arxiv-id');
			expect(paper).toBeNull();
		});
	});

	describe('getPaperByArxivIdAndUserId', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
			await createPaper({
				...mockPaperData,
				id: 'paper-different-user',
				userId: 'different-user',
				arxivId: 'arxiv-456' // Same arxiv ID, different user
			});
		});

		it('should return paper when both arxiv ID and user ID match', async () => {
			const paper = await getPaperByArxivIdAndUserId(mockPaperData.arxivId!, mockPaperData.userId);

			expect(paper).not.toBeNull();
			expect(paper!.arxivId).toBe(mockPaperData.arxivId);
			expect(paper!.userId).toBe(mockPaperData.userId);
			expect(paper!.id).toBe(mockPaperData.id);
		});

		it('should return null when arxiv ID matches but user ID does not', async () => {
			const paper = await getPaperByArxivIdAndUserId(mockPaperData.arxivId!, 'wrong-user');
			expect(paper).toBeNull();
		});

		it('should return null when neither matches', async () => {
			const paper = await getPaperByArxivIdAndUserId('wrong-arxiv', 'wrong-user');
			expect(paper).toBeNull();
		});
	});

	describe('updatePaper', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
		});

		it('should update paper title successfully', async () => {
			const newTitle = 'Updated Paper Title';
			await updatePaper(mockPaperData.id, { title: newTitle });

			const updatedPaper = await getPaperById(mockPaperData.id);
			expect(updatedPaper?.title).toBe(newTitle);
			expect(updatedPaper?.abstract).toBe(mockPaperData.abstract); // Should remain unchanged
		});

		it('should update authors array correctly', async () => {
			const newAuthors = ['New Author', 'Another New Author'];
			await updatePaper(mockPaperData.id, { authors: newAuthors });

			const updatedPaper = await getPaperById(mockPaperData.id);
			expect(updatedPaper?.authors).toEqual(newAuthors);
		});

		it('should update multiple fields at once', async () => {
			const updates = {
				title: 'New Title',
				abstract: 'New abstract content',
				publishedOn: '2024-02-01'
			};

			await updatePaper(mockPaperData.id, updates);

			const updatedPaper = await getPaperById(mockPaperData.id);
			expect(updatedPaper?.title).toBe(updates.title);
			expect(updatedPaper?.abstract).toBe(updates.abstract);
			expect(updatedPaper?.published).toBe(updates.publishedOn);
		});

		it('should handle partial updates', async () => {
			await updatePaper(mockPaperData.id, { abstract: 'Only abstract changed' });

			const updatedPaper = await getPaperById(mockPaperData.id);
			expect(updatedPaper?.abstract).toBe('Only abstract changed');
			expect(updatedPaper?.title).toBe(mockPaperData.title); // Should remain unchanged
		});
	});

	describe('deletePaper', () => {
		beforeEach(async () => {
			await createPaper(mockPaperData);
		});

		it('should delete paper successfully', async () => {
			await deletePaper(mockPaperData.id);

			const deletedPaper = await getPaperById(mockPaperData.id);
			expect(deletedPaper).toBeNull();
		});

		it('should not affect other papers', async () => {
			// Create another paper
			const anotherPaper: PaperData = {
				...mockPaperData,
				id: 'paper-to-keep',
				title: 'Paper to Keep'
			};
			await createPaper(anotherPaper);

			// Delete first paper
			await deletePaper(mockPaperData.id);

			// Check that the other paper still exists
			const keptPaper = await getPaperById(anotherPaper.id);
			expect(keptPaper).not.toBeNull();
			expect(keptPaper?.title).toBe(anotherPaper.title);
		});

		it('should handle deleting non-existent paper gracefully', async () => {
			// Should not throw an error
			await expect(deletePaper('nonexistent-id')).resolves.toBeDefined();
		});
	});
});