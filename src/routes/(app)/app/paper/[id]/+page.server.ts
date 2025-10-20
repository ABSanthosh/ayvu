import type { PageServerLoad } from './$types';
import { getFilesFromFolder, getFileContent } from '$lib/drive';
import {
	processHtmlImages,
	extractTableOfContents,
	processInlineStyles,
	processHtmlCssLinks
} from '$lib/utils/drive-image';
import { error, type Actions } from '@sveltejs/kit';
import type { EmbeddingsFile } from '$types/RAG.type';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { GOOGLE_AI_API_KEY } from '$env/static/private';

const SYSTEM_PROMPT = `You are a search query optimizer for vector database searches. The database has chunks of a single research paper. The research paper may be from any discipline. Your task is to reformulate user queries into more effective search terms.

Given a user's search query, you must:
1. Identify the core concepts and intent
2. Add relevant synonyms and related terms
3. Remove irrelevant filler words
4. Structure the query to emphasize key terms
5. Include technical or domain-specific terminology if applicable

Provide only the optimized search query without any explanations, greetings, or additional commentary.

Example input: "how to fix a bike tire that's gone flat"
Example output: "bicycle tire repair puncture fix patch inflate maintenance flat tire inner tube replacement"

Constraints:
- Output only the enhanced search terms
- Keep focus on searchable concepts
- Include both specific and general related terms
- Maintain all important meaning from original query
`;

export const load: PageServerLoad = async ({ params, parent }) => {
	const { user } = await parent();

	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		// Get files from the .ayvu folder with the paper ID
		const driveFileMap = await getFilesFromFolder(params.id, user.accessToken, user.refreshToken);

		// Get the HTML content from paper.html
		const htmlFileId = driveFileMap['paper.html'];
		if (!htmlFileId) {
			throw error(404, 'paper.html not found in the folder');
		}

		// const vectorsFileId = driveFileMap['embeddings.json'];
		// if (!vectorsFileId) {
		// 	throw error(404, 'embeddings.json not found in the folder');
		// }

		let htmlContent = await getFileContent(htmlFileId.id, user.accessToken, user.refreshToken);
		// let vectorsFile = await getFileContent(vectorsFileId.id, user.accessToken, user.refreshToken);

		// Process HTML to replace image sources and CSS links with Google Drive URLs
		// Use authenticated endpoints for private images
		htmlContent = processHtmlImages(htmlContent, driveFileMap, true);
		htmlContent = processHtmlCssLinks(htmlContent);
		htmlContent = processInlineStyles(htmlContent);

		// Extract table of contents and remove it from HTML
		const { toc, htmlContent: cleanedHtmlContent } = extractTableOfContents(htmlContent);

		return {
			paperId: params.id,
			htmlContent: cleanedHtmlContent,
			// embeddingsFile: vectorsFile,
			toc
		};
	} catch (err) {
		console.error('Error loading paper:', err);

		// Provide more specific error messages based on the error type
		if (err instanceof Error) {
			if (err.message.includes('not found')) {
				throw error(404, `Paper folder or files not found: ${err.message}`);
			} else if (err.message.includes('permission') || err.message.includes('access')) {
				throw error(403, `Access denied to Google Drive files: ${err.message}`);
			} else if (err.message.includes('quota') || err.message.includes('limit')) {
				throw error(429, `Google Drive API quota exceeded: ${err.message}`);
			}
		}

		throw error(
			500,
			`Failed to load paper: ${err instanceof Error ? err.message : 'Unknown error'}`
		);
	}
};

export const actions: Actions = {
	getEmbeddingsFile: async ({ params, locals }) => {
		const { user } = locals;
		// console.log(params);

		if (!user) {
			throw error(401, 'Unauthorized');
		}
		try {
			// Get files from the .ayvu folder with the paper ID
			const driveFileMap = await getFilesFromFolder(
				params.id!,
				user.accessToken,
				user.refreshToken
			);
			// Get the HTML content from paper.html
			const vectorsFileId = driveFileMap['embeddings.json'];
			if (!vectorsFileId) {
				throw error(404, 'embeddings.json not found in the folder');
			}

			let vectorsFile = await getFileContent(vectorsFileId.id, user.accessToken, user.refreshToken);
			return {
				embeddingsFile: vectorsFile as unknown as EmbeddingsFile
			};
		} catch (err) {
			console.error('Error getting embeddings file:', err);

			// Provide more specific error messages based on the error type
			if (err instanceof Error) {
				if (err.message.includes('not found')) {
					throw error(404, `Paper folder or files not found: ${err.message}`);
				} else if (err.message.includes('permission') || err.message.includes('access')) {
					throw error(403, `Access denied to Google Drive files: ${err.message}`);
				} else if (err.message.includes('quota') || err.message.includes('limit')) {
					throw error(429, `Google Drive API quota exceeded: ${err.message}`);
				}
			}

			throw error(
				500,
				`Failed to get embeddings file: ${err instanceof Error ? err.message : 'Unknown error'}`
			);
		}
	},
	rewrite: async ({ request }) => {
		const data = await request.formData();
		const prompt = data.get('prompt') as string;
		const googleAI = createGoogleGenerativeAI({
			apiKey: GOOGLE_AI_API_KEY
		});

		// console.log('Rewrite prompt:', prompt);

		const result = generateText({
			model: googleAI('gemini-2.5-flash'),
			system: SYSTEM_PROMPT,
			prompt
		});

		return { success: true, rewrittenQuery: (await result).text };
	}
};
