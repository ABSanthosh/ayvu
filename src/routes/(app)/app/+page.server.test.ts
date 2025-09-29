import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { actions, load } from './+page.server';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

// Create test database
const testDb = drizzle(createClient({ url: ':memory:' }));

// Mock database and external dependencies
vi.mock('$lib/db/Paper.db', () => ({
	getPapersByUserId: vi.fn().mockResolvedValue([]),
	createPaper: vi.fn().mockResolvedValue(undefined),
	getPaperByArxivIdAndUserId: vi.fn().mockResolvedValue(null)
}));

vi.mock('@sveltejs/kit', () => ({
	fail: vi.fn().mockImplementation((status, data) => ({ status, data }))
}));

// Mock fetch for arXiv API and external PDF extraction service
global.fetch = vi.fn();

describe('Paper Management Actions', () => {
	const mockUser = {
		googleId: 'user123',
		accessToken: 'access_token',
		refreshToken: 'refresh_token'
	};

	const mockRequest = (formData: Record<string, string>) => ({
		formData: vi.fn().mockResolvedValue({
			get: (key: string) => formData[key] || null
		})
	});

	const mockActionEvent = (arxivUrl: string, user = mockUser) => ({
		request: mockRequest({ arxivUrl }),
		locals: { user }
	});

	beforeEach(() => {
		vi.clearAllMocks();
		(global.fetch as any).mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('load function', () => {
		it('should return empty papers array when no user is logged in', async () => {
			const mockLoadEvent = {
				locals: { user: null }
			};

			const result = await load(mockLoadEvent as any);
			
			expect((result as any).papers).toEqual([]);
		});

		it('should return user papers when user is logged in', async () => {
			const mockPapers = [
				{
					id: 'paper1',
					title: 'Test Paper 1',
					authors: ['Author 1'],
					abstract: 'Test abstract 1',
					publishedOn: '2024-01',
					arxivId: '2401.12345',
					arxivUrl: 'https://arxiv.org/abs/2401.12345',
					userId: 'user123'
				}
			];

			const { getPapersByUserId } = await import('$lib/db/Paper.db');
			(getPapersByUserId as any).mockResolvedValue(mockPapers);

			const mockLoadEvent = {
				locals: { user: { googleId: 'user123' } }
			};

			const result = await load(mockLoadEvent as any);
			
			expect((result as any).papers).toEqual(mockPapers);
			expect(getPapersByUserId).toHaveBeenCalledWith('user123');
		});

		it('should handle database errors gracefully', async () => {
			const { getPapersByUserId } = await import('$lib/db/Paper.db');
			(getPapersByUserId as any).mockRejectedValue(new Error('Database error'));

			const mockLoadEvent = {
				locals: { user: { googleId: 'user123' } }
			};

			const result = await load(mockLoadEvent as any);
			
			expect((result as any).papers).toEqual([]);
		});
	});

	describe('createEntry action', () => {
		it('should validate required arxivUrl parameter', async () => {
			const { fail } = await import('@sveltejs/kit');
			
			const event = mockActionEvent('');
			const result = await actions.createEntry(event as any);
			
			expect(fail).toHaveBeenCalledWith(400, {
				error: {
					arxivUrl: 'ArXiv URL is required.'
				}
			});
		});

		it('should validate arXiv URL format', async () => {
			const { fail } = await import('@sveltejs/kit');
			
			const event = mockActionEvent('https://invalid-url.com');
			const result = await actions.createEntry(event as any);
			
			expect(fail).toHaveBeenCalledWith(400, {
				error: {
					arxivUrl: 'Please provide a valid arXiv URL in the format: https://arxiv.org/abs/XXXX.XXXXX'
				}
			});
		});

		it('should extract arXiv ID from valid URL', async () => {
			// Mock successful arXiv API response
			const mockArxivResponse = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
				<feed xmlns=\"http://www.w3.org/2005/Atom\">
					<entry>
						<title>Test Paper Title</title>
						<summary>Test abstract</summary>
						<author><name>Test Author</name></author>
						<published>2024-01-15T10:00:00Z</published>
					</entry>
				</feed>`;

			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					text: () => Promise.resolve(mockArxivResponse)
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ success: true })
				});

			const { getPaperByArxivIdAndUserId, createPaper } = await import('$lib/db/Paper.db');
			(getPaperByArxivIdAndUserId as any).mockResolvedValue(null);
			(createPaper as any).mockResolvedValue(undefined);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			const result = await actions.createEntry(event as any);

			expect((result as any).success).toBe(true);
			expect((result as any).paper?.arxivId).toBe('2401.12345');
		});

		it('should handle duplicate papers', async () => {
			const { fail } = await import('@sveltejs/kit');
			const paperDb = await import('$lib/db/Paper.db');
			
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue({
				id: 'existing_paper',
				arxivId: '2401.12345'
			});

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			await actions.createEntry(event as any);

			expect(fail).toHaveBeenCalledWith(400, {
				error: {
					arxivUrl: 'This paper has already been added to your collection.'
				}
			});
		});

		it('should handle arXiv API errors', async () => {
			(global.fetch as any).mockResolvedValueOnce({
				ok: false,
				status: 404
			});

			const { fail } = await import('@sveltejs/kit');
			const paperDb = await import('$lib/db/Paper.db');
			
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue(null);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			await actions.createEntry(event as any);

			expect(fail).toHaveBeenCalledWith(500, {
				error: {
					arxivUrl: 'An error occurred while adding the paper. Please try again.'
				}
			});
		});

		it('should process arXiv metadata correctly', async () => {
			const mockArxivResponse = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
				<feed xmlns=\"http://www.w3.org/2005/Atom\">
					<entry>
						<title>Advanced Machine Learning Techniques</title>
						<summary>This paper presents novel approaches to machine learning.</summary>
						<author><name>John Doe</name></author>
						<author><name>Jane Smith</name></author>
						<published>2024-01-15T10:00:00Z</published>
					</entry>
				</feed>`;

			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					text: () => Promise.resolve(mockArxivResponse)
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ success: true })
				});

			const paperDb = await import('$lib/db/Paper.db');
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue(null);
			(paperDb.createPaper as any).mockResolvedValue(undefined);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			const result = await actions.createEntry(event as any);

			expect((result as any).success).toBe(true);
			expect((result as any).paper?.title).toBe('Advanced Machine Learning Techniques');
			expect((result as any).paper?.authors).toEqual(['John Doe', 'Jane Smith']);
			expect((result as any).paper?.published).toBe('Jan 2024');
			
			expect(paperDb.createPaper).toHaveBeenCalledWith({
				id: '2401.12345',
				title: 'Advanced Machine Learning Techniques',
				abstract: 'This paper presents novel approaches to machine learning.',
				authors: ['John Doe', 'Jane Smith'],
				publishedOn: 'Jan 2024',
				arxivId: '2401.12345',
				arxivUrl: 'https://arxiv.org/abs/2401.12345',
				userId: 'user123'
			});
		});

		it('should handle external PDF extraction service errors', async () => {
			const mockArxivResponse = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>
				<feed xmlns=\"http://www.w3.org/2005/Atom\">
					<entry>
						<title>Test Paper</title>
						<summary>Test abstract</summary>
						<author><name>Test Author</name></author>
						<published>2024-01-15T10:00:00Z</published>
					</entry>
				</feed>`;

			(global.fetch as any)
				.mockResolvedValueOnce({
					ok: true,
					text: () => Promise.resolve(mockArxivResponse)
				})
				.mockResolvedValueOnce({
					ok: true,
					json: () => Promise.resolve({ error: 'PDF extraction failed' })
				});

			const { fail } = await import('@sveltejs/kit');
			const paperDb = await import('$lib/db/Paper.db');
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue(null);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			await actions.createEntry(event as any);

			expect(fail).toHaveBeenCalledWith(500, {
				error: {
					arxivUrl: 'Failed to process the paper. Please try again later.'
				}
			});
		});
	});

	describe('Error Handling and Edge Cases', () => {
		it('should handle malformed arXiv XML response', async () => {
			const malformedXML = 'This is not valid XML';

			(global.fetch as any).mockResolvedValueOnce({
				ok: true,
				text: () => Promise.resolve(malformedXML)
			});

			const { fail } = await import('@sveltejs/kit');
			const paperDb = await import('$lib/db/Paper.db');
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue(null);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			await actions.createEntry(event as any);

			expect(fail).toHaveBeenCalledWith(404, {
				error: {
					arxivUrl: 'Could not find paper with this arXiv ID. Please check the URL and try again.'
				}
			});
		});

		it('should handle network timeout errors', async () => {
			(global.fetch as any).mockRejectedValue(new Error('Network timeout'));

			const { fail } = await import('@sveltejs/kit');
			const paperDb = await import('$lib/db/Paper.db');
			(paperDb.getPaperByArxivIdAndUserId as any).mockResolvedValue(null);

			const event = mockActionEvent('https://arxiv.org/abs/2401.12345');
			await actions.createEntry(event as any);

			expect(fail).toHaveBeenCalledWith(500, {
				error: {
					arxivUrl: 'An error occurred while adding the paper. Please try again.'
				}
			});
		});
	});
});