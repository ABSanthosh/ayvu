<script lang="ts">
	import nanoid from '$lib/utils/nanoid';
	import { annotationStore } from '$lib/stores/AnnotationStore';

	let {
		paperId,
		onSave,
		onCancel
	}: {
		paperId: string;
		onSave: (data: {
			selectedText: string;
			note: string;
			highlightColor: string;
			startOffset: number;
			endOffset: number;
			anchorText: string;
		}) => void;
		onCancel: () => void;
	} = $props();

	let position = $state({ x: 0, y: 0 });
	let note = $state('');
	let highlightColor = $state('#ffeb3b');
	let selectedText = $state('');
	let anchorText = $state('');
	let startOffset = $state(0);
	let endOffset = $state(0);
	let popupElement = $state<HTMLDivElement>();

	const colors = [
		{ name: 'Yellow', value: '#ffeb3b' },
		{ name: 'Green', value: '#4caf50' },
		{ name: 'Blue', value: '#2196f3' },
		{ name: 'Pink', value: '#e91e63' },
		{ name: 'Purple', value: '#9c27b0' }
	];

	export function show(selection: Selection, rect: DOMRect) {
		selectedText = selection.toString().trim();
		
		// Get surrounding context for anchoring (50 chars before and after)
		const range = selection.getRangeAt(0);
		const textContent = range.commonAncestorContainer.textContent || '';
		const selectionStart = range.startOffset;
		const selectionEnd = range.endOffset;
		
		const contextStart = Math.max(0, selectionStart - 50);
		const contextEnd = Math.min(textContent.length, selectionEnd + 50);
		anchorText = textContent.substring(contextStart, contextEnd);
		
		startOffset = selectionStart;
		endOffset = selectionEnd;

		// Position the popup near the selection
		// Add scroll offsets for correct positioning
		position = {
			x: rect.left + window.scrollX + rect.width / 2,
			y: rect.top + window.scrollY - 10
		};
	}

	function handleSave() {
		if (!selectedText) return;

		onSave({
			selectedText,
			note,
			highlightColor,
			startOffset,
			endOffset,
			anchorText
		});

		// Reset
		note = '';
		highlightColor = '#ffeb3b';
	}

	function handleHighlightOnly() {
		if (!selectedText) return;

		onSave({
			selectedText,
			note: '',
			highlightColor,
			startOffset,
			endOffset,
			anchorText
		});
	}

	$effect(() => {
		if (popupElement) {
			const rect = popupElement.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			// Adjust horizontal position if off-screen
			if (position.x + rect.width / 2 > viewportWidth) {
				position.x = viewportWidth - rect.width / 2 - 10;
			}
			if (position.x - rect.width / 2 < 0) {
				position.x = rect.width / 2 + 10;
			}

			// Adjust vertical position if off-screen
			if (position.y - rect.height < 0) {
				position.y = position.y + rect.height + 30; // Show below selection
			}
		}
	});
</script>

<div
	class="annotation-popup"
	bind:this={popupElement}
	style="left: {position.x}px; top: {position.y}px;"
>
	<div class="annotation-popup__arrow"></div>
	
	<div class="annotation-popup__header">
		<span>Add Annotation</span>
		<button
			type="button"
			class="CrispButton"
			data-icon="close"
			aria-label="Cancel"
			onclick={onCancel}
		></button>
	</div>

	<div class="annotation-popup__colors">
		{#each colors as color}
			<button
				type="button"
				class="color-button"
				class:active={highlightColor === color.value}
				style="background-color: {color.value};"
				aria-label={color.name}
				onclick={() => (highlightColor = color.value)}
			></button>
		{/each}
	</div>

	<div class="annotation-popup__content">
		<textarea
			class="CrispInput"
			placeholder="Add your note here... (optional)"
			bind:value={note}
			rows="3"
		></textarea>
	</div>

	<div class="annotation-popup__actions">
		<button type="button" class="CrispButton" onclick={handleHighlightOnly}>
			Highlight Only
		</button>
		<button type="button" class="CrispButton" data-type="primary" onclick={handleSave}>
			Save Note
		</button>
	</div>
</div>

<style lang="scss">
	.annotation-popup {
		position: absolute;
		z-index: 1000;
		background: var(--elevation-1);
		border: 1px solid var(--muted-separator);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		min-width: 300px;
		max-width: 400px;
		transform: translate(-50%, -100%);
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&__arrow {
			position: absolute;
			bottom: -6px;
			left: 50%;
			transform: translateX(-50%);
			width: 12px;
			height: 12px;
			background: var(--elevation-1);
			border-right: 1px solid var(--muted-separator);
			border-bottom: 1px solid var(--muted-separator);
			transform: translateX(-50%) rotate(45deg);
		}

		&__header {
			padding: 10px 12px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: space-between, $align: center);

			span {
				font-size: 14px;
				font-weight: 600;
				color: var(--foreground);
				font-family: var(--font-family);
			}

			.CrispButton {
				@include box(20px, 20px);
				padding: 2px;
				border-radius: 4px;

				&::before {
					font-size: 16px;
				}
			}
		}

		&__colors {
			padding: 12px;
			gap: 8px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: flex-start, $align: center);

			.color-button {
				@include box(32px, 32px);
				border: 2px solid transparent;
				border-radius: 6px;
				cursor: pointer;
				transition: all 0.2s ease;

				&:hover {
					transform: scale(1.1);
					border-color: var(--foreground);
				}

				&.active {
					border-color: var(--foreground);
					box-shadow: 0 0 0 2px var(--elevation-1), 0 0 0 4px var(--foreground);
				}
			}
		}

		&__content {
			padding: 12px;

			textarea {
				width: 100%;
				resize: vertical;
				min-height: 60px;
				font-family: var(--font-family);
				font-size: 13px;
			}
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
			}
		}
	}
</style>
