<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$components/Modal.svelte';
	import PaperCard from '$components/PaperCard.svelte';
	import PaperForm from '$components/PaperForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showModal = $state(true);
	let formLoading = $state(false);
	let formErrors = $state({
		arxivUrl: ''
	});
	let formElement: HTMLFormElement;

	// Reset form when modal closes
	// $effect(() => {
	// 	if (!showModal) {
	// 		formErrors = { arxivUrl: '' };
	// 		if (formElement) {
	// 			formElement.reset();
	// 		}
	// 	}
	// });
</script>

<div class="Toolbar">
	<button
		class="CrispButton"
		onclick={() => {
			showModal = true;
			// Reset form errors when opening modal
			formErrors = { arxivUrl: '' };
		}}
	>
		Add Entry
	</button>
</div>
<main class="Papers">
	<Modal bind:showModal header="Add Entry">
		<!-- <form
			bind:this={formElement}
			use:enhance={() => {
				formLoading = true;
				// Clear any existing errors when submitting
				formErrors = { arxivUrl: '' };

				return async ({ update, result }) => {
					// @ts-ignore
					if (result.type === 'failure') {
						// @ts-ignore
						if (result.data?.error) {
							// @ts-ignore
							formErrors = { ...result.data.error };
						}
					} else if (result.type === 'success') {
						// @ts-ignore
						if (result.data?.success) {
							// Success! Close modal and reset form
							formErrors = { arxivUrl: '' };
							if (formElement) {
								formElement.reset();
							}
							showModal = false;
						}
					} else {
						// Handle any other unexpected result types
						console.error('Unexpected result type:', result.type);
					}

					formLoading = false;
					// await update();
				};
			}}
			method="POST"
			action="/app?/createEntry"
			class="Papers__newEntryForm"
		>
			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> arXiv URL </span>
				<input
					type="url"
					class="CrispInput"
					name="arxivUrl"
					id="arxivUrl"
					placeholder="https://arxiv.org/abs/2411.11908"
					required
					disabled={formLoading}
				/>
				{#if formErrors.arxivUrl !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.arxivUrl}
					</span>
				{/if}
			</label>

			<button
				class="CrispButton"
				style="margin-left: auto;"
				data-type="invert"
				type="submit"
				disabled={formLoading}
			>
				{#if formLoading}
					Fetching Paper...
				{:else}
					Add Paper
				{/if}
			</button>
		</form> -->

		<PaperForm />
	</Modal>

	{#each data.papers as paper, i (paper.id)}
		<PaperCard {...paper} type="No-Preview" />

		{#if i !== data.papers.length - 1}
			<hr />
		{/if}
	{/each}
</main>

<style lang="scss">
	.Papers {
		gap: 20px;
		padding: 20px 0;
		@include make-flex();
		@include box(100%, auto);

		& > hr {
			overflow: hidden;
			line-height: 11px;
			position: relative;
			border-style: none;
			@include box(100%, 10px);

			&::before {
				left: 0;
				right: 0;
				overflow: hidden;
				position: absolute;
				white-space: nowrap;
				color: var(--muted-foreground-3);
				content: '···················································································································';
			}
		}

		// &__newEntryForm {
		// 	gap: 20px;
		// 	padding: 7px 20px 20px 20px;
		// 	@include box();
		// 	min-width: 320px;
		// 	@include make-flex();

		// 	@include respondAt(470px) {
		// 		min-width: unset;
		// 	}
		// }
	}

	.Toolbar {
		@include box($height: auto);
		@include make-flex($dir: row, $just: flex-end);
	}
</style>
