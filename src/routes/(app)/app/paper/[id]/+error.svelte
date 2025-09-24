<script lang="ts">
	import { page } from '$app/stores';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Paper Not Found - Ayvu</title>
</svelte:head>

<div class="error-container">
	<div class="error-content">
		<h1>⚠️ Paper Load Error</h1>

		<div class="error-details">
			<h2>Status: {$page.status}</h2>
			<p class="error-message">{$page.error?.message || 'Unknown error occurred'}</p>
		</div>

		<div class="suggestions">
			<h3>Possible Solutions:</h3>
			<ul>
				<li>
					<strong>Folder not found:</strong> Make sure the paper folder exists in your Google Drive
					under <code>.ayvu/{$page.params.id}</code>
				</li>
				<li>
					<strong>Missing files:</strong> Ensure <code>paper.html</code> exists in the folder along with
					any referenced images and CSS files
				</li>
				<li>
					<strong>Permission issues:</strong> Check that your Google Drive access token is valid and
					has proper permissions
				</li>
				<li>
					<strong>API quota exceeded:</strong> Wait a few minutes and try again, or check your Google
					API usage limits
				</li>
			</ul>
		</div>

		<div class="actions">
			<a href="/app" class="btn btn-primary">← Back to Papers</a>
			<button onclick={() => window.location.reload()} class="btn btn-secondary">🔄 Retry</button>
		</div>

		<details class="technical-details">
			<summary>Technical Details</summary>
			<div class="tech-info">
				<p><strong>Paper ID:</strong> {$page.params.id}</p>
				<p><strong>Expected folder:</strong> <code>.ayvu/{$page.params.id}</code></p>
				<p><strong>Required file:</strong> <code>paper.html</code></p>
				<p><strong>User agent:</strong> {navigator?.userAgent || 'Unknown'}</p>
				<p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
			</div>
		</details>
	</div>
</div>

<style>
	.error-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 60vh;
		padding: 2rem;
	}

	.error-content {
		max-width: 600px;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		padding: 2rem;
		text-align: center;
	}

	.error-content h1 {
		color: #e74c3c;
		margin-bottom: 1.5rem;
		font-size: 2rem;
	}

	.error-details {
		background: #f8f9fa;
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1.5rem 0;
		border-left: 4px solid #e74c3c;
	}

	.error-details h2 {
		color: #c0392b;
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
	}

	.error-message {
		color: #666;
		font-family: monospace;
		background: #fff;
		padding: 0.5rem;
		border-radius: 4px;
		margin: 0;
		word-break: break-word;
	}

	.suggestions {
		text-align: left;
		margin: 2rem 0;
	}

	.suggestions h3 {
		color: #2c3e50;
		margin-bottom: 1rem;
	}

	.suggestions ul {
		padding-left: 1.5rem;
	}

	.suggestions li {
		margin: 0.75rem 0;
		line-height: 1.5;
	}

	.suggestions code {
		background: #f1f2f6;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: monospace;
		color: #e74c3c;
	}

	.actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		margin: 2rem 0;
	}

	.btn {
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-weight: 500;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: #3498db;
		color: white;
	}

	.btn-primary:hover {
		background: #2980b9;
	}

	.btn-secondary {
		background: #95a5a6;
		color: white;
	}

	.btn-secondary:hover {
		background: #7f8c8d;
	}

	.technical-details {
		margin-top: 2rem;
		text-align: left;
	}

	.technical-details summary {
		cursor: pointer;
		color: #7f8c8d;
		font-size: 0.9rem;
		padding: 0.5rem;
		border-radius: 4px;
	}

	.technical-details summary:hover {
		background: #f8f9fa;
	}

	.tech-info {
		background: #2c3e50;
		color: #ecf0f1;
		padding: 1rem;
		border-radius: 4px;
		margin-top: 0.5rem;
		font-family: monospace;
		font-size: 0.8rem;
	}

	.tech-info p {
		margin: 0.25rem 0;
	}

	.tech-info code {
		color: #f39c12;
		background: transparent;
	}
</style>
