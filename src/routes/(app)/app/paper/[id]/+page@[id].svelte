<script lang="ts">
	import type { PageData } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import Sidebar from '$components/Sidebar.svelte';

	let { data } = $props() as { data: PageData & { toc?: TocEntry[] } };

	let isSidebarOpen = $state(false);
</script>

<main class="PaperPage">
	<Sidebar isOpen={isSidebarOpen}>
		<TableOfContents toc={data.toc} />
	</Sidebar>
	<div class="paper-content">
		<button
			data-icon={isSidebarOpen ? 'side_navigation' : 'dock_to_right'}
			aria-label="Toggle Menu"
			class="CrispButton menu-button"
			onclick={() => (isSidebarOpen = !isSidebarOpen)}
		></button>
		<!-- {@html data.htmlContent} -->
	</div>
</main>

<style lang="scss">
	.PaperPage {
		// gap: 8px;
		@include box();
		padding: 0px 0;
		overflow-y: auto;
		position: relative;
		@include make-flex($align: flex-start, $dir: row);
	}

	.paper-content {
		padding: 20px;
		@include box();
		overflow: hidden;
		position: relative;
		border-radius: 7px;
		background-color: var(--background);
		border: 1px solid var(--muted-separator);

		& > :global(.ltx_page_main) {
			overflow-y: auto;
		}
	}
	.menu-button {
		top: 12px;
		left: 12px;
		z-index: 1000;
		position: absolute;
		border-radius: 4px;
		@include box(35px, 35px);
	}
</style>
