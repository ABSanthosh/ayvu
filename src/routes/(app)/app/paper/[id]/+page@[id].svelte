<script lang="ts">
	import type { PageProps } from './$types';
	import type { TocEntry } from '$lib/types/Toc.type';
	import AIChat from '$lib/components/AIChat.svelte';
	import TableOfContents from '$lib/components/TableOfContents.svelte';
	import TryGemini from '$components/TryGemini.svelte';
	import AnnotationPopup from '$lib/components/AnnotationPopup.svelte';
	import { getContext, onMount } from 'svelte';
	import { annotationStore } from '$lib/stores/AnnotationStore';
	import { enhance } from '$app/forms';
	import nanoid from '$lib/utils/nanoid';

	let annotations = $state<any[]>([]);

	let { data, form } = $props() as PageProps & { toc?: TocEntry[] };

	// Calculate contrasting text color based on background brightness
	function getContrastColor(hexColor: string): string {
		// Convert hex to RGB
		const hex = hexColor.replace('#', '');
		const r = parseInt(hex.substr(0, 2), 16);
		const g = parseInt(hex.substr(2, 2), 16);
		const b = parseInt(hex.substr(4, 2), 16);

		// Calculate relative luminance
		const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

		// Return dark text for light backgrounds, light text for dark backgrounds
		return luminance > 0.5 ? 'rgba(0, 0, 0, 0.87)' : 'rgba(255, 255, 255, 0.95)';
	}

	let isSidebarOpen = getContext<{ default: boolean }>('isSidebarOpen');
	let isAIChatOpen = getContext<{ default: boolean }>('isAIChatOpen');

	// Default panel sizes
	const DEFAULT_TOC_WIDTH = 336;
	const DEFAULT_AI_CHAT_WIDTH = 336;

	// Screen width for responsive behavior
	let innerWidth = $state(0);
	let selectedText = $state('');
	let showAnnotationPopup = $state(false);
	let popupPosition = $state({ x: 0, y: 0 });
	let currentSelection = $state<Selection | null>(null);
	let annotationPopupComponent = $state<any>(null);
	let paperContentElement = $state<HTMLDivElement>();
	let showContextMenu = $state(false);
	let contextMenuPosition = $state({ x: 0, y: 0 });
	let contextMenuAnnotation = $state<any>(null);
	let showAnnotationView = $state(false);
	let viewAnnotationPosition = $state({ x: 0, y: 0 });
	let viewAnnotation = $state<any>(null);
	let isEditingNote = $state(false);
	let editNoteText = $state('');

	// Load annotations on mount and subscribe to changes
	onMount(() => {
		if (data.annotations) {
			annotationStore.setAnnotations(data.annotations);
		}

		const unsubscribe = annotationStore.subscribe((store) => {
			annotations = store.annotations;
		});

		return unsubscribe;
	});

	// Apply highlights to the document
	function applyHighlights() {
		if (!paperContentElement) return;
		if (annotations.length === 0) return;

		// Remove existing highlights first
		const existingHighlights = paperContentElement.querySelectorAll('mark.text-highlight');
		existingHighlights.forEach((el) => {
			const parent = el.parentNode;
			if (parent) {
				parent.replaceChild(document.createTextNode(el.textContent || ''), el);
				parent.normalize(); // Merge adjacent text nodes
			}
		});

		// Get all paragraph elements that might contain text
		const paragraphs = paperContentElement.querySelectorAll(
			'p, div.ltx_para, span, h1, h2, h3, h4, h5, h6'
		);

		for (const annotation of annotations) {
			let found = false;

			// Try to find the text in each paragraph
			for (const para of paragraphs) {
				if (found) break;

				const textContent = para.textContent || '';
				const index = textContent.indexOf(annotation.selectedText);

				if (index !== -1) {
					// Use a tree walker to find the exact text node
					const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT, null);

					let currentOffset = 0;
					let node: Node | null;

					while ((node = walker.nextNode())) {
						const textNode = node as Text;
						const nodeLength = textNode.length;
						const nodeStart = currentOffset;
						const nodeEnd = currentOffset + nodeLength;

						// Check if annotation starts in this text node
						if (index >= nodeStart && index < nodeEnd) {
							const startInNode = index - nodeStart;
							const endInNode = Math.min(startInNode + annotation.selectedText.length, nodeLength);

							try {
								const range = document.createRange();
								range.setStart(textNode, startInNode);
								range.setEnd(textNode, endInNode);

								const highlight = document.createElement('mark');
								highlight.className = 'text-highlight';
								const bgColor = annotation.highlightColor || '#ffeb3b';
								highlight.style.backgroundColor = bgColor;
								highlight.style.color = getContrastColor(bgColor);
								highlight.setAttribute('data-annotation-id', annotation.id);
								highlight.setAttribute('title', annotation.note || 'Click to view note');

								range.surroundContents(highlight);
								found = true;
								break;
							} catch (e) {
								console.warn('Could not apply highlight:', e);
							}
						}

						currentOffset += nodeLength;
					}
				}
			}
		}
	}

	// Re-apply highlights when annotations change
	$effect(() => {
		if (paperContentElement && annotations.length > 0) {
			// Small delay to ensure DOM is ready
			setTimeout(() => {
				applyHighlights();
				attachHighlightClickHandlers();
			}, 100);
		}
	});

	// Attach click handlers to highlights
	function attachHighlightClickHandlers() {
		if (!paperContentElement) return;

		const highlights = paperContentElement.querySelectorAll('mark.text-highlight');
		highlights.forEach((highlight) => {
			highlight.addEventListener('click', handleHighlightClick);
		});
	}

	// Handle click on highlights
	function handleHighlightClick(event: Event) {
		event.stopPropagation();
		const target = event.target as HTMLElement;
		const annotationId = target.getAttribute('data-annotation-id');
		const annotation = annotations.find((a) => a.id === annotationId);

		if (annotation) {
			const rect = target.getBoundingClientRect();
			viewAnnotation = annotation;

			// Position below the highlight
			viewAnnotationPosition = {
				x: rect.left + rect.width / 2,
				y: rect.bottom + window.scrollY + 10
			};
			showAnnotationView = true;
		}
	}

	// Handle right-click on highlights
	function handleHighlightContextMenu(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('text-highlight')) {
			event.preventDefault();
			const annotationId = target.getAttribute('data-annotation-id');
			const annotation = annotations.find((a) => a.id === annotationId);

			if (annotation) {
				contextMenuAnnotation = annotation;

				// Adjust position to keep menu on screen
				const menuWidth = 350;
				const menuHeight = 200; // Approximate
				let x = event.clientX;
				let y = event.clientY;

				if (x + menuWidth > window.innerWidth) {
					x = window.innerWidth - menuWidth - 10;
				}
				if (y + menuHeight > window.innerHeight) {
					y = window.innerHeight - menuHeight - 10;
				}

				contextMenuPosition = { x, y };
				showContextMenu = true;
			}
		}
	}

	function handleDeleteFromContext() {
		if (contextMenuAnnotation) {
			handleAnnotationDelete(contextMenuAnnotation.id);
			showContextMenu = false;
			contextMenuAnnotation = null;
		}
	}

	function handleEditFromContext() {
		// You could implement edit functionality here
		showContextMenu = false;
	}

	function closeContextMenu() {
		showContextMenu = false;
		contextMenuAnnotation = null;
	}

	function closeAnnotationView() {
		showAnnotationView = false;
		viewAnnotation = null;
		isEditingNote = false;
		editNoteText = '';
	}

	function handleEditAnnotation() {
		if (viewAnnotation) {
			console.log('Edit clicked, current note:', viewAnnotation.note);
			isEditingNote = true;
			editNoteText = viewAnnotation.note || '';
			console.log('isEditingNote set to:', isEditingNote);
			console.log('editNoteText set to:', editNoteText);
		}
	}

	async function handleSaveEditedNote() {
		if (viewAnnotation) {
			await handleAnnotationUpdate(viewAnnotation.id, editNoteText);
			// Update the viewAnnotation note immediately for display
			viewAnnotation = { ...viewAnnotation, note: editNoteText };
			// Exit edit mode but keep popup open
			isEditingNote = false;
			editNoteText = '';
		}
	}

	function handleCancelEdit() {
		isEditingNote = false;
		editNoteText = '';
	}

	function handleDeleteAnnotation() {
		if (viewAnnotation && confirm('Are you sure you want to delete this annotation?')) {
			handleAnnotationDelete(viewAnnotation.id);
			closeAnnotationView();
		}
	}

	// Close context menu on click outside
	$effect(() => {
		if (showContextMenu) {
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.highlight-context-menu')) {
					closeContextMenu();
				}
			};

			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	// Close annotation view on click outside
	$effect(() => {
		if (showAnnotationView) {
			const handleClickOutside = (e: MouseEvent) => {
				const target = e.target as HTMLElement;
				if (!target.closest('.annotation-view-popup') && !target.closest('.text-highlight')) {
					closeAnnotationView();
				}
			};

			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	function handleSelection() {
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed) {
			const text = selection.toString().trim();
			if (text) {
				const range = selection.getRangeAt(0);
				const rect = range.getBoundingClientRect();

				currentSelection = selection;
				showAnnotationPopup = true;

				// Show the popup component
				if (annotationPopupComponent) {
					annotationPopupComponent.show(selection, rect);
				}

				// Also set for AI chat
				selectedText = text;
			}
		} else if (selection && (selection.rangeCount === 0 || selection.isCollapsed)) {
			// Clear selected text when selection is cancelled or collapsed
			selectedText = '';
			showAnnotationPopup = false;
		}
	}

	function handleMouseDown() {
		// Clear selected text when user starts a new selection
		const selection = window.getSelection();
		if (selection && selection.toString().trim() === '') {
			selectedText = '';
			showAnnotationPopup = false;
		}
	}

	function handleAnnotationSave(annotationData: any) {
		const annotationForm = document.getElementById('annotationForm') as HTMLFormElement;
		if (annotationForm) {
			// Set the input values
			(annotationForm.querySelector('input[name="selectedText"]') as HTMLInputElement).value =
				annotationData.selectedText;
			(annotationForm.querySelector('input[name="anchorText"]') as HTMLInputElement).value =
				annotationData.anchorText;
			(annotationForm.querySelector('input[name="note"]') as HTMLInputElement).value =
				annotationData.note;
			(annotationForm.querySelector('input[name="highlightColor"]') as HTMLInputElement).value =
				annotationData.highlightColor;
			(annotationForm.querySelector('input[name="startOffset"]') as HTMLInputElement).value =
				annotationData.startOffset.toString();
			(annotationForm.querySelector('input[name="endOffset"]') as HTMLInputElement).value =
				annotationData.endOffset.toString();

			annotationForm.requestSubmit();
		}
		showAnnotationPopup = false;
		window.getSelection()?.removeAllRanges();
	}

	function handleAnnotationCancel() {
		showAnnotationPopup = false;
		window.getSelection()?.removeAllRanges();
	}

	async function handleAnnotationUpdate(id: string, note: string) {
		const updateForm = document.getElementById('updateAnnotationForm') as HTMLFormElement;
		if (updateForm) {
			(updateForm.querySelector('input[name="id"]') as HTMLInputElement).value = id;
			(updateForm.querySelector('input[name="note"]') as HTMLInputElement).value = note;
			updateForm.requestSubmit();
		}
	}

	async function handleAnnotationDelete(id: string) {
		const deleteForm = document.getElementById('deleteAnnotationForm') as HTMLFormElement;
		if (deleteForm) {
			(deleteForm.querySelector('input[name="id"]') as HTMLInputElement).value = id;
			deleteForm.requestSubmit();
		}
	}
</script>

<svelte:window bind:innerWidth />

<!-- Hidden forms for annotation actions -->
<form
	id="annotationForm"
	method="POST"
	action="?/createAnnotation"
	style="display: none;"
	use:enhance={() => {
		return async ({ update, result }) => {
			if (result.type === 'success') {
				const data = result.data as { annotation?: any };
				if (data?.annotation) {
					annotationStore.addAnnotation(data.annotation);
				}
			}
			await update();
		};
	}}
>
	<input type="hidden" name="selectedText" />
	<input type="hidden" name="anchorText" />
	<input type="hidden" name="note" />
	<input type="hidden" name="highlightColor" />
	<input type="hidden" name="startOffset" />
	<input type="hidden" name="endOffset" />
</form>

<form
	id="updateAnnotationForm"
	method="POST"
	action="?/updateAnnotation"
	style="display: none;"
	use:enhance={() => {
		return async ({ update, result }) => {
			if (result.type === 'success') {
				const formData = new FormData(
					document.getElementById('updateAnnotationForm') as HTMLFormElement
				);
				const id = formData.get('id') as string;
				const note = formData.get('note') as string;
				annotationStore.updateAnnotation(id, { note });
			}
			await update();
		};
	}}
>
	<input type="hidden" name="id" />
	<input type="hidden" name="note" />
</form>

<form
	id="deleteAnnotationForm"
	method="POST"
	action="?/deleteAnnotation"
	style="display: none;"
	use:enhance={() => {
		return async ({ update, result }) => {
			if (result.type === 'success') {
				const formData = new FormData(
					document.getElementById('deleteAnnotationForm') as HTMLFormElement
				);
				const id = formData.get('id') as string;
				annotationStore.removeAnnotation(id);
			}
			await update();
		};
	}}
>
	<input type="hidden" name="id" />
</form>

<main class="PaperPage">
	<div class="resizable-container">
		<div
			class="panel-wrapper toc-panel"
			style="width: {isSidebarOpen.default && innerWidth >= 1180
				? `${DEFAULT_TOC_WIDTH}px`
				: '0px'}"
		>
			<TableOfContents toc={data.toc} />
		</div>

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="paper-content"
			bind:this={paperContentElement}
			onmouseup={handleSelection}
			onmousedown={handleMouseDown}
			oncontextmenu={handleHighlightContextMenu}
		>
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
			style="width: {isAIChatOpen.default && innerWidth >= 1180
				? `${DEFAULT_AI_CHAT_WIDTH}px`
				: '0px'}"
		>
			<AIChat arxivId={data.paperId} abstract={data.abstract} bind:form bind:selectedText />
		</div>
	</div>
</main>

{#if showAnnotationPopup}
	<AnnotationPopup
		bind:this={annotationPopupComponent}
		paperId={data.paperId}
		onSave={handleAnnotationSave}
		onCancel={handleAnnotationCancel}
	/>
{/if}

{#if showContextMenu && contextMenuAnnotation}
	<div
		class="highlight-context-menu"
		style="left: {contextMenuPosition.x}px; top: {contextMenuPosition.y}px;"
	>
		<div class="highlight-context-menu__header">
			<span class="highlight-context-menu__text">"{contextMenuAnnotation.selectedText}"</span>
		</div>
		{#if contextMenuAnnotation.note}
			<div class="highlight-context-menu__note">
				<strong>Note:</strong>
				{contextMenuAnnotation.note}
			</div>
		{/if}
		<div class="highlight-context-menu__actions">
			<button
				type="button"
				class="highlight-context-menu__button"
				onclick={handleDeleteFromContext}
			>
				<span data-icon="delete"></span>
				Remove Highlight
			</button>
		</div>
	</div>
{/if}

{#if showAnnotationView && viewAnnotation}
	<div
		class="annotation-view-popup"
		style="left: {viewAnnotationPosition.x}px; top: {viewAnnotationPosition.y}px;"
	>
		<div class="annotation-view-popup__arrow"></div>

		<div class="annotation-view-popup__header">
			<div
				class="annotation-view-popup__color"
				style="background-color: {viewAnnotation.highlightColor}"
			></div>
			<span class="annotation-view-popup__date">
				{new Date(viewAnnotation.createdAt).toLocaleDateString()}
			</span>
			<button
				type="button"
				class="CrispButton"
				data-icon="close"
				aria-label="Close"
				onclick={closeAnnotationView}
			></button>
		</div>

		<div class="annotation-view-popup__content">
			{#if isEditingNote}
				<!-- DEBUG: Edit mode active -->
				<div class="annotation-view-popup__edit">
					<label for="edit-note-textarea">Edit your note:</label>
					<textarea
						id="edit-note-textarea"
						bind:value={editNoteText}
						rows="4"
						placeholder="Add your note here..."
					></textarea>
				</div>
			{:else if viewAnnotation.note}
				<!-- DEBUG: View mode with note -->
				<div class="annotation-view-popup__note">
					<strong>Your note:</strong>
					<p>{viewAnnotation.note}</p>
				</div>
			{:else}
				<div class="annotation-view-popup__no-note">
					<em>No note added</em>
				</div>
			{/if}
		</div>

		<div class="annotation-view-popup__actions">
			{#if isEditingNote}
				<button type="button" class="CrispButton" onclick={handleCancelEdit}>
					Cancel
				</button>
				<button type="button" class="CrispButton" data-type="primary" onclick={handleSaveEditedNote}>
					Save
				</button>
			{:else}
				<button
					type="button"
					class="CrispButton"
					data-icon="edit"
					onclick={(e) => {
						e.stopPropagation();
						handleEditAnnotation();
					}}
				>
					Edit Note
				</button>
				<button
					type="button"
					class="CrispButton"
					data-icon="delete"
					onclick={(e) => {
						e.stopPropagation();
						handleDeleteAnnotation();
					}}
				>
					Delete
				</button>
			{/if}
		</div>
	</div>
{/if}

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

		// Highlight styles for annotated text
		:global(.text-highlight),
		:global(mark.text-highlight) {
			padding: 2px 4px;
			border-radius: 3px;
			cursor: pointer;
			position: relative;
			transition: all 0.2s ease;
			border: none;
			font-weight: 500;
			line-height: 1.6;
			user-select: none;

			&:hover {
				opacity: 0.9;
				box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.15);
				transform: translateY(-1px);
			}

			&:active {
				transform: translateY(0);
			}
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

	.annotation-view-popup {
		position: absolute;
		z-index: 1001;
		background: var(--elevation-1);
		border: 1px solid var(--muted-separator);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		min-width: 320px;
		max-width: 400px;
		transform: translateX(-50%);
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&__arrow {
			position: absolute;
			top: -6px;
			left: 50%;
			transform: translateX(-50%) rotate(45deg);
			width: 12px;
			height: 12px;
			background: var(--elevation-1);
			border-left: 1px solid var(--muted-separator);
			border-top: 1px solid var(--muted-separator);
		}

		&__header {
			padding: 10px 12px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: space-between, $align: center);
			gap: 8px;
		}

		&__color {
			@include box(28px, 28px);
			border-radius: 6px;
			border: 2px solid var(--muted-separator);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		}

		&__date {
			flex: 1;
			font-size: 12px;
			color: var(--muted-foreground-2);
			font-family: var(--font-family);
		}

		&__content {
			padding: 12px;
			gap: 12px;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);
		}

		&__edit {
			gap: 8px;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);

			label {
				font-size: 12px;
				font-weight: 600;
				color: var(--muted-foreground-2);
				font-family: var(--font-family);
			}

			textarea {
				width: 100%;
				resize: vertical;
				min-height: 80px;
				font-family: var(--font-family);
				font-size: 13px;
				padding: 8px;
				border-radius: 4px;
				border: 1px solid var(--muted-separator);
				background: var(--elevation-2);
				color: var(--foreground);

				&:focus {
					outline: none;
					border-color: var(--foreground);
				}
			}
		}

		&__note {
			gap: 4px;
			@include make-flex($dir: column, $just: flex-start, $align: flex-start);

			strong {
				font-size: 12px;
				font-weight: 600;
				color: var(--muted-foreground-2);
				font-family: var(--font-family);
			}

			p {
				margin: 0;
				font-size: 13px;
				line-height: 1.5;
				color: var(--foreground);
				font-family: var(--font-family);
			}
		}

		&__no-note {
			padding: 8px;
			text-align: center;
			font-size: 13px;
			color: var(--muted-foreground-3);
			font-family: var(--font-family);
		}

		&__actions {
			padding: 8px 12px;
			gap: 8px;
			border-top: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: flex-end, $align: center);

			.CrispButton {
				font-size: 13px;
				padding: 6px 12px;
				border-radius: 4px;
				gap: 6px;
				@include make-flex($dir: row, $just: center, $align: center);

				&[data-icon]::before {
					font-size: 14px;
				}
			}
		}

		.CrispButton[data-icon='close'] {
			@include box(20px, 20px);
			padding: 2px;
			border-radius: 4px;

			&::before {
				font-size: 16px;
			}
		}
	}

	.highlight-context-menu {
		position: fixed;
		z-index: 1001;
		background: var(--elevation-1);
		border: 1px solid var(--muted-separator);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		min-width: 250px;
		max-width: 350px;
		overflow: hidden;
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&__header {
			padding: 12px;
			background: var(--elevation-2);
			border-bottom: 1px solid var(--muted-separator);
		}

		&__text {
			font-size: 13px;
			font-style: italic;
			color: var(--muted-foreground-1);
			font-family: var(--font-family);
			display: block;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		&__note {
			padding: 12px;
			font-size: 13px;
			line-height: 1.5;
			color: var(--foreground);
			font-family: var(--font-family);
			border-bottom: 1px solid var(--muted-separator);

			strong {
				font-weight: 600;
				color: var(--muted-foreground-2);
				display: block;
				margin-bottom: 4px;
			}
		}

		&__actions {
			padding: 8px;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);
			gap: 4px;
		}

		&__button {
			padding: 8px 12px;
			background: transparent;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-family: var(--font-family);
			font-size: 13px;
			color: var(--foreground);
			transition: background 0.2s ease;
			@include make-flex($dir: row, $just: flex-start, $align: center);
			gap: 8px;

			span[data-icon] {
				font-size: 16px;
			}

			&:hover {
				background: var(--elevation-2);
			}

			&:active {
				background: var(--elevation-3);
			}
		}
	}
</style>
