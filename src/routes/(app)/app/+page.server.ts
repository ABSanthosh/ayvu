import type { Actions, PageServerLoad } from './$types';
// import nanoid from '$utils/nanoid';
import { fail } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';
import { createPaper, getPapersByUserId, getPaperByArxivIdAndUserId } from '$lib/db/Paper.db';

export const load: PageServerLoad = async ({ locals }) => {
	try {
		// Redirect to auth if no user
		if (!locals.user) {
			return {
				papers: []
			};
		}

		// Fetch papers for the specific user
		const papers = await getPapersByUserId(locals.user.googleId);

		return {
			papers
		};
	} catch (error) {
		console.error('Error loading papers:', error);
		// Fallback to empty array if database fails
		return {
			papers: []
		};
	}
};

function extractArxivId(url: string): string | null {
	// More flexible regex to handle different arXiv URL formats
	const regex = /arxiv\.org\/abs\/(\d{4}\.\d{4,5}(?:v\d+)?)/i;
	const match = url.match(regex);
	const arxivId = match ? match[1] : null;

	// Remove version suffix if present (e.g., v1, v2) for API call
	if (arxivId && arxivId.includes('v')) {
		return arxivId.split('v')[0];
	}

	return arxivId;
}

async function fetchArxivMetadata(arxivId: string) {
	const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const xmlText = await response.text();

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: '@_'
		});
		const result = parser.parse(xmlText);

		const entry = result.feed?.entry;
		if (!entry) {
			throw new Error('Paper not found');
		}

		const title = entry.title?.replace(/\s+/g, ' ').trim() || '';
		const abstract = entry.summary?.replace(/\s+/g, ' ').trim() || '';
		const published = entry.published
			? new Date(entry.published).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'short'
				})
			: '';

		// Handle authors array
		let authors: string[] = [];
		if (entry.author) {
			if (Array.isArray(entry.author)) {
				authors = entry.author.map((author: any) => author.name || '').filter(Boolean);
			} else {
				authors = [entry.author.name || ''].filter(Boolean);
			}
		}

		return {
			title,
			abstract,
			authors,
			published
		};
	} catch (error) {
		console.error('Error fetching arXiv metadata:', error);
		throw error;
	}
}

export const actions: Actions = {
	createEntry: async ({ request, locals }) => {
		const data = await request.formData();
		const arxivUrl = data.get('arxivUrl') as string;

		if (!arxivUrl) {
			return fail(400, {
				error: {
					arxivUrl: 'ArXiv URL is required.'
				}
			});
		}

		// Validate arXiv URL format
		const arxivId = extractArxivId(arxivUrl);

		if (!arxivId) {
			return fail(400, {
				error: {
					arxivUrl:
						'Please provide a valid arXiv URL in the format: https://arxiv.org/abs/XXXX.XXXXX'
				}
			});
		}

		try {
			// Check if paper already exists for this user
			const existingPaper = await getPaperByArxivIdAndUserId(arxivId, locals.user!.googleId);
			if (existingPaper) {
				return fail(400, {
					error: {
						arxivUrl: 'This paper has already been added to your collection.'
					}
				});
			}

			// Fetch metadata from arXiv API
			const metadata = await fetchArxivMetadata(arxivId);

			// Generate unique ID for the paper
			// const paperId = nanoid();

			const extractPaper = await fetch(
				`http://localhost:8000/arxiv/${arxivId}?refresh_token=${encodeURIComponent(locals.user!.refreshToken)}&access_token=${encodeURIComponent(locals.user!.accessToken)}`
			).then((res) => res.json());

			if (extractPaper.error) {
				console.error('Error from extract service:', extractPaper.error);
				return fail(500, {
					error: {
						arxivUrl: 'Failed to process the paper. Please try again later.'
					}
				});
			}

			// Store in database using abstracted function
			await createPaper({
				id: arxivId,
				title: metadata.title,
				abstract: metadata.abstract,
				authors: metadata.authors,
				publishedOn: metadata.published,
				arxivId,
				arxivUrl,
				userId: locals.user!.googleId
			});

			return {
				success: true,
				paper: {
					id: arxivId,
					arxivId,
					arxivUrl,
					...metadata
				}
			};
		} catch (error) {
			console.error('Failed to fetch arXiv metadata:', error);

			// Check if it's a database error vs API error
			if (error instanceof Error && error.message.includes('Paper not found')) {
				return fail(404, {
					error: {
						arxivUrl: 'Could not find paper with this arXiv ID. Please check the URL and try again.'
					}
				});
			}

			// General error (could be network, database, etc.)
			return fail(500, {
				error: {
					arxivUrl: 'An error occurred while adding the paper. Please try again.'
				}
			});
		}
	}
};
