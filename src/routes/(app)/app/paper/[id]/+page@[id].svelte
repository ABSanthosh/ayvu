<script lang="ts">
	import type { PageData } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import TableOfContents from '$lib/components/TableOfContents.svelte';

	let { data } = $props() as { data: PageData & { toc?: TocEntry[] } };
</script>

{#if data.htmlContent}
	<!-- Display Table of Contents if available -->
	{#if data.toc && data.toc.length > 0}
		<!-- @ts-ignore -->
		<!-- <TableOfContents toc={data.toc} /> -->
	{/if}

	<!-- Render raw HTML with Drive CSS only -->
	<div class="paper-content">
		{@html data.htmlContent}
	</div>
{:else}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading paper content from Google Drive...</p>
	</div>
{/if}

<style>
	/* Loading states only */
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		text-align: center;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #3498db;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	.paper-content {
		margin-top: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}
</style>
