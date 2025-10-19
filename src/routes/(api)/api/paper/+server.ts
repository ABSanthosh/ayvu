import { createPaper, getPaperByArxivIdAndUserId } from '$db/Paper.db';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { XMLParser } from 'fast-xml-parser';

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

export const POST: RequestHandler = async ({ request, locals }) => {
	const formData = await request.formData();
	const arxivUrl = formData.get('arxivUrl') as string;
	console.log('Received ArXiv URL:', arxivUrl);

	if (!arxivUrl) {
		return error(400, {
			message: 'ArXiv URL is required.'
		});
	}

	// Validate arXiv URL format
	const arxivId = extractArxivId(arxivUrl);
	if (!arxivId) {
		return error(400, {
			message: 'Please provide a valid arXiv URL in the format: https://arxiv.org/abs/XXXX.XXXXX'
		});
	}

	// Check if paper already exists for this user
	const existingPaper = await getPaperByArxivIdAndUserId(arxivId, locals.user!.googleId);
	if (existingPaper) {
		return error(400, {
			message: 'This paper has already been added to your collection.'
		});
	}

	const metadata = await fetchArxivMetadata(arxivId);
	if (!metadata) {
		return error(404, {
			message: 'Paper not found.'
		});
	}

	const sseUrl = `http://localhost:8000/arxiv/${arxivId}?refresh_token=${encodeURIComponent(
		locals.user!.refreshToken
	)}&access_token=${encodeURIComponent(locals.user!.accessToken)}`;

	const response = await fetch(sseUrl);
	if (!response.body) {
		throw new Error('No response body from SSE endpoint');
	}

	console.log('SSE Response received');
	const progressStream = new ReadableStream({
		async start(controller) {
			const reader = response.body!.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });

					let lines = buffer.split('\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (line.startsWith('data: ')) {
							try {
								const data = JSON.parse(line.slice(6));
								controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
								if (data.type === 'complete') {
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
									controller.enqueue(
										new TextEncoder().encode(
											`data: ${JSON.stringify({ type: 'success', data: { arxivId, ...metadata } })}\n\n`
										)
									);
									controller.close();
									break;
								} else if (data.type === 'error') {
									controller.enqueue(
										new TextEncoder().encode(
											`data: ${JSON.stringify({ type: 'error', data: { error: data.data?.error || data.error || 'Processing failed' } })}\n\n`
										)
									);
									controller.close();
									break;
								}
							} catch (parseErr) {
								console.error('Error parsing SSE data:', parseErr);
								// Skip malformed data lines
							}
						}
					}
				}
			} catch (err) {
				controller.enqueue(
					new TextEncoder().encode(
						`data: ${JSON.stringify({ type: 'error', data: { error: 'SSE connection failed' } })}\n\n`
					)
				);
				controller.close();
			}
		},
		cancel() {
			response.body?.cancel();
		}
	});

	return new Response(progressStream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
