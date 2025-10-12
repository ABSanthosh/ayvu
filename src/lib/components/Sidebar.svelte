<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, isOpen = $bindable() }: { children: Snippet; isOpen: boolean } = $props();
</script>

<aside class="Sidebar" class:isOpen>
	{@render children?.()}
</aside>

<style lang="scss">
	.Sidebar {
		overflow-y: auto;
		@include box(0);
		transition: all 0.3s ease-in-out;
		@include make-flex($dir: column, $just: flex-start, $align: flex-start);

		&.isOpen {
			margin-right: 8px;
			@include box(340px);
		}
	}
</style>
