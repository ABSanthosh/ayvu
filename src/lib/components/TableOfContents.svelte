<script lang="ts">
	import type { TocEntry } from '$lib/types/Toc.type';
	import { onMount } from 'svelte';

	let { toc, isOpen = $bindable() }: { toc: TocEntry[]; isOpen: boolean } = $props();

	let activeSection = $state('');
	let tocContainer = $state<HTMLElement>();
	let isExpanded = $state(true);

	/**
	 * Scroll to a section smoothly
	 */
	function scrollToSection(id: string) {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({
				behavior: 'smooth',
				block: 'start'
			});
			activeSection = id;
		}
	}

	/**
	 * Recursively render TOC entries with proper nesting
	 */
	function renderTocEntry(
		entry: TocEntry,
		depth = 0
	): { entry: TocEntry; depth: number; children: ReturnType<typeof renderTocEntry>[] } {
		return {
			entry,
			depth,
			children: entry.children?.map((child) => renderTocEntry(child, depth + 1)) || []
		};
	}

	/**
	 * Flatten TOC for intersection observer
	 */
	function flattenToc(entries: TocEntry[]): TocEntry[] {
		const flattened: TocEntry[] = [];

		function flatten(items: TocEntry[]) {
			for (const item of items) {
				flattened.push(item);
				if (item.children) {
					flatten(item.children);
				}
			}
		}

		flatten(entries);
		return flattened;
	}

	/**
	 * Set up intersection observer to track active sections
	 */
	onMount(() => {
		const flatToc = flattenToc(toc);
		const sectionIds = flatToc.map((entry) => entry.id);

		const observer = new IntersectionObserver(
			(entries) => {
				let mostVisible = null;
				let maxRatio = 0;

				for (const entry of entries) {
					if (entry.intersectionRatio > maxRatio) {
						maxRatio = entry.intersectionRatio;
						mostVisible = entry.target.id;
					}
				}

				if (mostVisible) {
					activeSection = mostVisible;
				}
			},
			{
				threshold: [0, 0.25, 0.5, 0.75, 1],
				rootMargin: '-10% 0px -80% 0px'
			}
		);

		// Observe all sections
		sectionIds.forEach((id) => {
			const element = document.getElementById(id);
			if (element) {
				observer.observe(element);
			}
		});

		return () => {
			observer.disconnect();
		};
	});
</script>

{#if toc && toc.length > 0}
	<aside class="toc" bind:this={tocContainer} class:isOpen>
		<div class="toc__header">
			<h3>Contents</h3>
		</div>

		{#if isExpanded}
			<nav class="toc__nav" aria-label="Table of contents">
				<ul class="toc__list">
					{#each toc as entry}
						{@render tocItem(renderTocEntry(entry))}
					{/each}
				</ul>
			</nav>
		{/if}
	</aside>
{/if}

{#snippet tocItem(item: { entry: TocEntry; depth: number; children: any[] })}
	<li class="toc__item toc__item--{item.entry.level}" data-depth={item.depth}>
		<a
			href="#{item.entry.id}"
			class="toc__link"
			class:toc__link--active={activeSection === item.entry.id}
			onclick={(e) => {
				e.preventDefault();
				scrollToSection(item.entry.id);
			}}
		>
			<span class="toc__tag">{item.entry.tag}</span>
			<span class="toc__title">{item.entry.title}</span>
		</a>

		{#if item.children.length > 0}
			<ul class="toc__sublist">
				{#each item.children as child}
					{@render tocItem(child)}
				{/each}
			</ul>
		{/if}
	</li>
{/snippet}

<style lang="scss">
	.toc {
		@include box(0);
		flex-shrink: 0;
		border-radius: 8px;
		background-color: #000;
		@include make-flex($dir: column, $just: flex-start, $align: flex-start);
		transition: all 0.3s ease-in-out;

		&.isOpen {
			flex-shrink: 0;
			@include box(330px);
			padding: 16px 10px 0px 0px;
		}

		&__header {
			width: 100%;
			margin-bottom: 12px;
			padding-bottom: 8px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($dir: row, $just: space-between, $align: center);
			flex-shrink: 0;

			h3 {
				margin: 0;
				font-size: 18px;
				font-weight: 600;
				color: var(--foreground);
			}
		}

		&__nav {
			flex: 1;
			overflow-y: auto;
			padding-right: 9px;
			min-height: 0; // Important for flex child to scroll

			& > ::-webkit-scrollbar-thumb {
				background: var(--foreground-tertiary);
				border-radius: 3px;

				&:hover {
					background: var(--foreground);
				}
			}

			@include respondAt(768px) {
				max-height: none;
			}
		}

		&__list {
			min-width: 300px;
		}

		&__list,
		&__sublist {
			list-style: none;
			padding: 0;
			margin: 0;
		}

		&__sublist {
			margin-left: 20px;
			// margin-top: 4px;
		}

		&__item {
			margin-bottom: 4px;

			&--section {
				margin-bottom: 8px;

				// & + .toc__item--section {
				// 	margin-top: 16px;
				// }
			}

			&--subsection {
				.toc__link {
					font-size: 14px;
					padding-left: 12px;
				}
			}

			&--subsubsection {
				.toc__link {
					font-size: 13px;
					padding-left: 24px;
				}
			}
		}

		&__link {
			display: block;
			text-decoration: none;
			color: var(--foreground-secondary);
			padding: 6px 8px;
			border-radius: 4px;
			transition: all 0.2s ease;
			@include make-flex($dir: row, $align: flex-start, $just: flex-start);
			gap: 8px;
			line-height: 1.4;

			&:hover {
				background: var(--foreground-secondary);
				color: var(--background);
			}

			&--active {
				background: var(--foreground);
				color: var(--background);
				font-weight: 500;

				.toc__tag {
					color: var(--background);
					opacity: 0.8;
				}
			}
		}

		&__tag {
			flex-shrink: 0;
			font-weight: 600;
			font-size: 12px;
			color: var(--foreground-tertiary);
			min-width: 24px;
		}

		&__title {
			flex: 1;
			@include clamp(2);
		}

		// Animation for collapse/expand
		&__nav {
			animation: slideDown 0.3s ease-out;
		}

		@keyframes slideDown {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		// Print styles
		@media print {
			display: none;
		}
	}
</style>
