<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, isOpen = $bindable() }: { children: Snippet; isOpen: boolean } = $props();
</script>

<aside class="Sidebar" class:isOpen>
	{@render children?.()}
</aside>

<style lang="scss">
	.Sidebar {
		max-height: 100vh;
		overflow-x: hidden;
		// padding-right: 8px;
		@include box(0, 100vh);
		transition: all 0.3s ease-in-out;
		// border-right: 1px solid var(--muted-separator);
		@include make-flex($dir: column, $just: flex-start, $align: flex-start);

		&.isOpen {
			@include box(340px);
      margin-right: 8px;
			// padding: 40px 20px 15px 20px;
		}
	}
</style>
