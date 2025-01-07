import adapter from '@sveltejs/adapter-auto';
import autoprefixer from 'autoprefixer';
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
			$components: 'src/lib/components',
			$styles: 'src/styles/routes',
			$utils: 'src/lib/utils',
			$data: 'src/lib/data'
		},
	},
	compilerOptions: {
		runes: true
	}
};

export default config;
