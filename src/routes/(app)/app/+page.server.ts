import type { PageServerLoad } from './$types';
import { getPapersByUserId } from '$lib/db/Paper.db';

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
