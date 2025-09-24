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
</nav>

<div class="Toolbar">
	<a href="/app" > &lt; Back to Papers </a>
</div>

{@render children?.()}

<style lang="scss">
	.AppHeader {
		gap: 10px;
		@include box($height: 60px);
		@include make-flex($dir: row, $just: space-between);
		@include respondAt(400px) {
			flex-direction: column;
			height: auto;
			padding: 10px 0;
		}

		&__nav {
			gap: 8px;
			list-style: none;
			@include make-flex($dir: row, $just: space-between);

			@include respondAt(400px) {
				margin-right: auto;
			}

			& > h2 > a {
				user-select: none;
				margin-right: 10px;
				text-decoration: none;
				color: var(--foreground);

				font-size: 32px;
				font-weight: 500;
				font-family: 'Editorial New', serif;
				@include respondAt(400px) {
					margin-right: auto;
				}
			}
		}
	}

	.Toolbar {
		@include box($height: auto);
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
