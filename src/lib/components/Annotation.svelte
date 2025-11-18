<script lang="ts">
	import type { AnnotationData } from '$lib/db/Annotation.db';
	import { annotationStore } from '$lib/stores/AnnotationStore';

	let {
		annotation,
		onUpdate,
		onDelete
	}: {
		annotation: AnnotationData;
		onUpdate: (id: string, note: string) => void;
		onDelete: (id: string) => void;
	} = $props();

	let isEditing = $state(false);
	let editedNote = $state(annotation.note || '');
	let isExpanded = $state(false);

	function handleSave() {
		onUpdate(annotation.id, editedNote);
		isEditing = false;
	}

	function handleCancel() {
		editedNote = annotation.note || '';
		isEditing = false;
	}

	$effect(() => {
		editedNote = annotation.note || '';
	});
</script>

<div class="annotation-marker" style="background-color: {annotation.highlightColor};">
	<button
		type="button"
		class="annotation-marker__toggle"
		onclick={() => (isExpanded = !isExpanded)}
		aria-label="Toggle annotation"
	>
		<span class="annotation-marker__icon" data-icon="note"></span>
	</button>

	{#if isExpanded}
		<div class="annotation-card">
			<div class="annotation-card__header">
				<span class="annotation-card__date">
					{new Date(annotation.createdAt).toLocaleDateString()}
				</span>
				<div class="annotation-card__actions">
					{#if !isEditing}
						<button
							type="button"
							class="CrispButton"
							data-icon="edit"
							aria-label="Edit"
							onclick={() => (isEditing = true)}
						></button>
					{/if}
					<button
						type="button"
						class="CrispButton"
						data-icon="delete"
						aria-label="Delete"
						onclick={() => onDelete(annotation.id)}
					></button>
				</div>
			</div>

			<div class="annotation-card__content">
				<div class="annotation-card__text">
					<strong>Selected text:</strong>
					<p>"{annotation.selectedText}"</p>
				</div>

				{#if isEditing}
					<div class="annotation-card__edit">
						<textarea
							class="CrispInput"
							bind:value={editedNote}
							placeholder="Your note..."
							rows="3"
						></textarea>
						<div class="annotation-card__edit-actions">
							<button type="button" class="CrispButton" onclick={handleCancel}> Cancel </button>
							<button type="button" class="CrispButton" data-type="primary" onclick={handleSave}>
								Save
							</button>
						</div>
					</div>
				{:else if annotation.note}
					<div class="annotation-card__note">
						<strong>Your note:</strong>
						<p>{annotation.note}</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style lang="scss">
	.annotation-marker {
		display: inline-block;
		position: relative;
		padding: 2px;
		border-radius: 3px;
		cursor: pointer;
		opacity: 0.4;
		transition: opacity 0.2s ease;

		&:hover {
			opacity: 0.7;
		}

		&__toggle {
			background: none;
			border: none;
			padding: 0;
			margin: 0;
			cursor: pointer;
			@include box(20px, 20px);
			@include make-flex($just: center, $align: center);
		}

		&__icon {
			font-size: 16px;
			color: var(--foreground);
		}
	}

	.annotation-card {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 8px;
		min-width: 300px;
		max-width: 400px;
		background: var(--elevation-1);
		border: 1px solid var(--muted-separator);
		border-radius: 8px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		z-index: 100;
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&__header {
			padding: 8px 12px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: space-between, $align: center);
		}

		&__date {
			font-size: 12px;
			color: var(--muted-foreground-2);
			font-family: var(--font-family);
		}

		&__actions {
			gap: 4px;
			@include make-flex($dir: row, $just: flex-end, $align: center);

			.CrispButton {
				@include box(24px, 24px);
				padding: 4px;
				border-radius: 4px;

				&::before {
					font-size: 14px;
				}
			}
		}

		&__content {
			padding: 12px;
			gap: 12px;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);
		}

		&__text,
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

		&__text p {
			font-style: italic;
			color: var(--muted-foreground-1);
		}

		&__edit {
			gap: 8px;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);

			textarea {
				width: 100%;
				font-family: var(--font-family);
				font-size: 13px;
				resize: vertical;
			}
		}

		&__edit-actions {
			gap: 8px;
			@include make-flex($dir: row, $just: flex-end, $align: center);

			.CrispButton {
				font-size: 13px;
				padding: 6px 12px;
				border-radius: 4px;
			}
		}
	}
</style>
