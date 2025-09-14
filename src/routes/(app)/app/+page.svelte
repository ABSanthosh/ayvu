<script lang="ts">
	import { enhance } from '$app/forms';
	import Modal from '$components/Modal.svelte';
	import PaperCard from '$components/PaperCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showModal = $state(true);
	let formLoading = $state(false);
	let formErrors = $state({
		title: '',
		authors: '',
		publishedOn: '',
		abstract: '',
		pdf: ''
	});

</script>

<div class="Toolbar">
	<button class="CrispButton" onclick={() => (showModal = true)}> Add Entry </button>
</div>
<main class="Papers">
	<Modal bind:showModal header="Add Entry">
		<form
			use:enhance={() => {
				formLoading = true;

				return async ({ update, result }) => {
					// @ts-ignore
					// console.log(result, ...result.data.error);
					if (result.status === 406) {
						// @ts-ignore
						formErrors = { ...formErrors, ...result.data.error };
					}

					formLoading = false;
					await update();
				};
			}}
			method="POST"
			action="/app?/createEntry"
			class="Papers__newEntryForm"
			enctype="multipart/form-data"
		>
			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> Title </span>
				<input type="text" class="CrispInput" name="title" id="title" required />
				{#if formErrors.title !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.title}
					</span>
				{/if}
			</label>

			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> Authors (comma separated names) </span>
				<input type="text" class="CrispInput" name="authors" id="authors" required />
				{#if formErrors.authors !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.authors}
					</span>
				{/if}
			</label>

			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> Published Month </span>
				<input type="month" class="CrispInput" name="publishedOn" id="publishedOn" required />
				{#if formErrors.publishedOn !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.publishedOn}
					</span>
				{/if}
			</label>

			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> Abstract </span>
				<textarea class="CrispInput" style="resize: none;" name="abstract" id="abstract" required
				></textarea>
				{#if formErrors.abstract !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.abstract}
					</span>
				{/if}
			</label>

			<label class="CrispLabel" data-justify="space-between">
				<span data-mandatory style="color: inherit;"> Paper PDF </span>
				<input type="file" class="CrispInput" name="pdf" id="pdf" accept=".pdf" required />
				{#if formErrors.pdf !== ''}
					<span class="CrispMessage" data-type="error">
						{formErrors.pdf}
					</span>
				{/if}
			</label>

			<button class="CrispButton" style="margin-left: auto;" data-type="invert" type="submit">
				Submit
			</button>
		</form>
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

		&__newEntryForm {
			gap: 20px;
			padding: 7px 20px 20px 20px;
			@include box();
			min-width: 390px;
			@include make-flex();

			@include respondAt(470px) {
				min-width: unset;
			}
		}
	}

	.Toolbar {
		@include box($height: auto);
		@include make-flex($dir: row, $just: flex-end);
	}
</style>
