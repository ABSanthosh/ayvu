<script lang="ts">
	import type { PageProps } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import AIChat from '$lib/components/AIChat.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';

	let { data, form } = $props() as PageProps & { toc?: TocEntry[] };

	let isSidebarOpen = $state(false);
</script>

<!-- <AIChat arxivId={data.paperId} bind:form /> -->

<main class="PaperPage">
	<TableOfContents
		toc={data.toc}
		isOpen={isSidebarOpen}
		toggleOpen={() => (isSidebarOpen = !isSidebarOpen)}
	/>
	<div class="paper-content">
		<button
			data-icon={isSidebarOpen ? 'side_navigation' : 'dock_to_right'}
			aria-label="Toggle Menu"
			class="CrispButton menu-button"
			onclick={() => (isSidebarOpen = !isSidebarOpen)}
		>
		</button>
		{@html data.htmlContent}
	</div>
</main>

<style lang="scss">
	.PaperPage {
		@include box();
		padding: 0;
		overflow: hidden;
		@include make-flex($align: flex-start, $dir: row);
	}

	.paper-content {
		padding: 20px 8px 20px 20px;
		flex: 1;
		height: 100%;
		overflow: hidden;
		position: relative;
		border-radius: 7px;
		background-color: var(--background);
		border: 1px solid var(--muted-separator);

		& > :global(.ltx_page_main) {
			height: 100%;
			overflow-y: auto;
			padding-right: 10px;
		}
		:global(.ltx_document) {
			height: 100%;
			overflow: hidden;
			// margin: 0 auto;
			max-width: 1024px;
		}
	}
	.menu-button {
		top: 12px;
		left: 12px;
		z-index: 10;
		position: absolute;
		border-radius: 4px;
		@include box(35px, 35px);
	}
</style>
