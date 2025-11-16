<script lang="ts">
	import { type Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<nav class="AppHeader">
	<ul class="AppHeader__nav">
		<h2>
			<a href="/"> ayvu </a>
		</h2>
	</ul>
	<div class="Toolbar">
		<!-- <a href="/app"> &lt; Back to Papers </a> -->
	</div>
</nav>

{@render children?.()}

<style lang="scss">
	:global(body:has(.paper-content)) {
		max-width: 100%;
		padding: 0;
		overflow: hidden;
		background-color: #000;
		@include box(100dvw, 100dvh);
	}

	:global(#app:has(.paper-content)) {
		// gap: 10px;
		height: 100%;
		overflow: hidden;
		@include make-flex($dir: column, $just: flex-start);
	}
	.AppHeader {
		gap: 10px;
		background-color: #000;
		@include box($height: 30px);
		border-bottom: 1px solid var(--muted-separator);
		@include make-flex($dir: row, $just: space-between);

		&__nav {
			gap: 8px;
			padding: 5px 10px;
			list-style: none;
			@include box($height: 100%);
			@include make-flex($dir: row, $just: space-between);

			& > h2 {
				@include box($height: 100%);
				margin-top: -4px;

				& > a {
					user-select: none;
					margin-right: 10px;
					text-decoration: none;
					color: var(--foreground);
					@include box($height: 100%);

					font-size: 18px;
					font-weight: 500;
					font-family: 'Editorial New', serif;
					@include respondAt(400px) {
						margin-right: auto;
					}
				}
			}
		}
	}

	.Toolbar {
		@include box(auto, auto);
		@include make-flex($dir: row, $just: flex-start);

		& > a {
			text-decoration: none;
			color: var(--foreground-secondary);
			font-size: 14px;
			padding: 6px 12px;
			border: 1px solid var(--foreground-secondary);
			border-radius: 4px;
			transition:
				background-color 0.2s,
				color 0.2s,
				border-color 0.2s;

			&:hover {
				background-color: var(--foreground-secondary);
				color: var(--background);
				border-color: var(--foreground-secondary);
			}
		}
	}
</style>
