import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	let pageTitle = '';
	switch (url.pathname.split('/')[2]) {
		case undefined:
			pageTitle = 'Your Reads';
			break;
		case 'explore':
			pageTitle = 'Explore';
			break;
		default:
			pageTitle = 'Your Reads';
			break;
	}

	return {
		pageTitle
	};
};
