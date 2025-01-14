<script lang="ts">
	import PaperCard from '$components/PaperCard.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<main class="Papers">
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
	}
</style>
