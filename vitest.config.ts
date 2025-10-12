import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			include: ['src/**/*.{js,ts,svelte}', '!src/**/*.test.{js,ts}', '!src/**/*.spec.{js,ts}'],
			exclude: [
				'.svelte-kit/**',
				'node_modules/**',
				'build/**',
				'dist/**',
				'**/*.config.{js,ts}',
				'**/types/**',
				'**/*.d.ts',
				'src/app.html',
				'src/service-worker.ts'
			],
			thresholds: {
				global: {
					branches: 85,
					functions: 90,
					lines: 90,
					statements: 90
				}
			}
		},
		globals: true,
		setupFiles: ['src/test/setup.ts']
	}
});
