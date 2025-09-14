import autoprefixer from 'autoprefixer';
import adapter from '@sveltejs/adapter-auto';
import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: sveltePreprocess({
		scss: {
			prependData: `
				@use "src/styles/root/_mixins.scss" as *;
			`,
		},
		postcss: {
			plugins: [autoprefixer()]
		}
	}),
	kit: {
		adapter: adapter(),
		alias: {
			$db: 'src/lib/db',
			$data: 'src/lib/data',
			$utils: 'src/lib/utils',
			$types: 'src/lib/types',
			$styles: 'src/styles/routes',
			$directive: 'src/lib/directive',
			$components: 'src/lib/components',
		},
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
