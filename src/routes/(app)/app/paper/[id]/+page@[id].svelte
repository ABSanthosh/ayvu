<script lang="ts">
	import type { PageProps } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import AIChat from '$lib/components/AIChat.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import TryGemini from '$components/TryGemini.svelte';
	import { getContext, setContext } from 'svelte';

	let { data, form } = $props() as PageProps & { toc?: TocEntry[] };

	let isSidebarOpen = getContext<{ default: boolean }>('isSidebarOpen');
	let isAIChatOpen = getContext<{ default: boolean }>('isAIChatOpen');

	// Default panel sizes
	const DEFAULT_TOC_WIDTH = 336;
	const DEFAULT_AI_CHAT_WIDTH = 336;

	// Screen width for responsive behavior
	let innerWidth = $state(0);
</script>

<svelte:window bind:innerWidth />

<main class="PaperPage">
	<div class="resizable-container">
		<div
			class="panel-wrapper toc-panel"
			style="width: {isSidebarOpen.default && innerWidth >= 1180 ? `${DEFAULT_TOC_WIDTH}px` : '0px'}"
		>
			<TableOfContents
				toc={data.toc}
			/>
		</div>

		<div class="paper-content">
			<button
				data-icon={isSidebarOpen.default ? 'side_navigation' : 'dock_to_right'}
				aria-label="Toggle Menu"
				class="CrispButton menu-button"
				onclick={() => (isSidebarOpen.default = !isSidebarOpen.default)}
			>
			</button>
			{@html data.htmlContent}

			<TryGemini onclick={() => (isAIChatOpen.default = !isAIChatOpen.default)} />
		</div>

		<div
			class="panel-wrapper ai-chat-panel"
			style="width: {isAIChatOpen.default && innerWidth >= 1180 ? `${DEFAULT_AI_CHAT_WIDTH}px` : '0px'}"
		>
			<AIChat arxivId={data.paperId} abstract={data.abstract} bind:form />
		</div>
	</div>
</main>

<style lang="scss">
	.PaperPage {
		@include box();
		padding: 0;
		overflow: hidden;
		@include make-flex($align: flex-start, $dir: row);
	}

	.resizable-container {
		@include box();
		@include make-flex($align: flex-start, $dir: row);
		position: relative;
	}

	.panel-wrapper {
		height: 100%;
		flex-shrink: 0;
		position: relative;
		transition: width 0.3s ease-in-out;

		&.toc-panel {
			@include respondAt(1180px) {
				width: 0 !important;
			}
		}

		&.ai-chat-panel {
			@include respondAt(1180px) {
				width: 0 !important;
			}
		}
	}

	.paper-content {
		padding: 20px 8px 20px 20px;
		flex: 1;
		height: 100%;
		overflow: hidden;
		position: relative;
		// border-radius: 7px;
		background-color: var(--background);

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
