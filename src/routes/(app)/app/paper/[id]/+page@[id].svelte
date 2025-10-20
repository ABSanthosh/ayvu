<script lang="ts">
	import type { PageProps } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import AIChat from '$lib/components/AIChat.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import TryGemini from '$components/TryGemini.svelte';

	let { data, form } = $props() as PageProps & { toc?: TocEntry[] };

	let isSidebarOpen = $state(false);
	let isAIChatOpen = $state(true);

	// Default panel sizes
	const DEFAULT_TOC_WIDTH = 336;
	const DEFAULT_AI_CHAT_WIDTH = 336;

	// Resizable panels state
	let tocWidth = $state(DEFAULT_TOC_WIDTH);
	let aiChatWidth = $state(DEFAULT_AI_CHAT_WIDTH);
	let isDraggingToc = $state(false);
	let isDraggingAiChat = $state(false);
	let dragStartX = $state(0);
	let dragStartWidth = $state(0);

	// Screen width for responsive behavior
	let innerWidth = $state(0);

	// Drag handlers for TOC resizer
	function handleTocDragStart(e: MouseEvent) {
		if (innerWidth < 1180) return; // Don't resize on mobile
		isDraggingToc = true;
		dragStartX = e.clientX;
		dragStartWidth = tocWidth;
		document.body.classList.add('dragging');
		document.addEventListener('mousemove', handleTocDrag);
		document.addEventListener('mouseup', handleTocDragEnd);
		e.preventDefault();
	}

	function handleTocDrag(e: MouseEvent) {
		if (!isDraggingToc) return;
		const deltaX = e.clientX - dragStartX;
		const newWidth = Math.max(200, Math.min(600, dragStartWidth + deltaX));
		tocWidth = newWidth;
	}

	function handleTocDragEnd() {
		isDraggingToc = false;
		document.body.classList.remove('dragging');
		document.removeEventListener('mousemove', handleTocDrag);
		document.removeEventListener('mouseup', handleTocDragEnd);
	}

	// Drag handlers for AI Chat resizer
	function handleAiChatDragStart(e: MouseEvent) {
		if (innerWidth < 1180) return; // Don't resize on mobile
		isDraggingAiChat = true;
		dragStartX = e.clientX;
		dragStartWidth = aiChatWidth;
		document.body.classList.add('dragging');
		document.addEventListener('mousemove', handleAiChatDrag);
		document.addEventListener('mouseup', handleAiChatDragEnd);
		e.preventDefault();
	}

	function handleAiChatDrag(e: MouseEvent) {
		if (!isDraggingAiChat) return;
		const deltaX = dragStartX - e.clientX; // Reverse direction for right panel
		const newWidth = Math.max(200, Math.min(600, dragStartWidth + deltaX));
		aiChatWidth = newWidth;
	}

	function handleAiChatDragEnd() {
		isDraggingAiChat = false;
		document.body.classList.remove('dragging');
		document.removeEventListener('mousemove', handleAiChatDrag);
		document.removeEventListener('mouseup', handleAiChatDragEnd);
	}

	// Keyboard support for resize handles
	function handleTocKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			tocWidth = Math.max(200, tocWidth - 10);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			tocWidth = Math.min(600, tocWidth + 10);
		}
	}

	function handleAiChatKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			aiChatWidth = Math.min(600, aiChatWidth + 10);
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			aiChatWidth = Math.max(200, aiChatWidth - 10);
		}
	}

	// Double-click handlers to reset to default sizes
	function handleTocDoubleClick() {
		tocWidth = DEFAULT_TOC_WIDTH;
	}

	function handleAiChatDoubleClick() {
		aiChatWidth = DEFAULT_AI_CHAT_WIDTH;
	}
</script>

<svelte:window bind:innerWidth />

<main class="PaperPage">
	<div class="resizable-container">
		<div 
			class="panel-wrapper toc-panel" 
			style="width: {isSidebarOpen && innerWidth >= 1180 ? `${tocWidth}px` : '0px'}"
		>
			<TableOfContents
				toc={data.toc}
				isOpen={isSidebarOpen}
				toggleOpen={() => (isSidebarOpen = !isSidebarOpen)}
			/>
			{#if isSidebarOpen && innerWidth >= 1180}
				<button
					type="button"
					aria-label="Resize table of contents. Use arrow keys to adjust width, or double-click to reset to default size."
					class="resize-handle resize-handle--right"
					class:resize-handle--dragging={isDraggingToc}
					onmousedown={handleTocDragStart}
					onkeydown={handleTocKeydown}
					ondblclick={handleTocDoubleClick}
				></button>
			{/if}
		</div>

		<div class="paper-content">
			<button
				data-icon={isSidebarOpen ? 'side_navigation' : 'dock_to_right'}
				aria-label="Toggle Menu"
				class="CrispButton menu-button"
				onclick={() => (isSidebarOpen = !isSidebarOpen)}
			>
			</button>
			{@html data.htmlContent}

			<TryGemini onclick={() => (isAIChatOpen = !isAIChatOpen)} />
		</div>

		<div 
			class="panel-wrapper ai-chat-panel" 
			style="width: {isAIChatOpen && innerWidth >= 1180 ? `${aiChatWidth}px` : '0px'}"
		>
			{#if isAIChatOpen && innerWidth >= 1180}
				<button
					type="button"
					aria-label="Resize AI chat. Use arrow keys to adjust width, or double-click to reset to default size."
					class="resize-handle resize-handle--left"
					class:resize-handle--dragging={isDraggingAiChat}
					onmousedown={handleAiChatDragStart}
					onkeydown={handleAiChatKeydown}
					ondblclick={handleAiChatDoubleClick}
				></button>
			{/if}
			<AIChat bind:isOpen={isAIChatOpen} arxivId={data.paperId} bind:form />
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
		position: relative;
		flex-shrink: 0;
		height: 100%;
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

	.resize-handle {
		border: none;
		background: none;
		padding: 0;
		position: absolute;
		top: 0;
		bottom: 0;
		width: 4px;
		z-index: 10;
		cursor: col-resize;
		transition: background-color 0.2s ease;

		&:hover,
		&:focus,
		&--dragging {
			background-color: var(--accent-1);
			outline: none;
		}

		&:not(:hover):not(:focus):not(&--dragging) {
			background-color: transparent;
		}

		&--right {
			right: -2px;
		}

		&--left {
			left: -2px;
		}

		// Add a visible indicator on hover/focus
		&::before {
			content: '';
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 2px;
			height: 40px;
			background-color: var(--muted-separator);
			border-radius: 1px;
			opacity: 0;
			transition: opacity 0.2s ease;
		}

		&:hover::before,
		&:focus::before,
		&--dragging::before {
			opacity: 1;
		}

		// Hide on mobile
		@include respondAt(1180px) {
			display: none;
		}
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
