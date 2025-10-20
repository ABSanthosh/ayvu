<script lang="ts">
	import type { TocEntry } from '$lib/types/Toc.type';
	import { onMount } from 'svelte';

	let {
		toc,
		isOpen = $bindable(),
		toggleOpen = $bindable()
	}: { toc: TocEntry[]; isOpen: boolean; toggleOpen: () => void } = $props();

	let activeSection = $state('');
	let tocContainer = $state<HTMLDialogElement>();
	let isExpanded = $state(true);

	let innerWidth = $state(0);

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

	$effect(() => {
		if (innerWidth >= 1180) {
			if (tocContainer && tocContainer.open) {
				tocContainer.close();
			}
		}
	});

	$effect(() => {
		if (tocContainer && innerWidth < 1180) {
			if (isOpen) {
				tocContainer.showModal();
			} else {
				tocContainer.close();
			}
		}
	});

	// Add this in onMount or as a separate effect
	$effect(() => {
		if (tocContainer && innerWidth < 1180) {
			const handleBackdropClick = (e: MouseEvent) => {
				const rect = tocContainer!.getBoundingClientRect();
				if (
					e.clientX < rect.left ||
					e.clientX > rect.right ||
					e.clientY < rect.top ||
					e.clientY > rect.bottom
				) {
					toggleOpen();
				}
			};

			tocContainer.addEventListener('click', handleBackdropClick);
			return () => tocContainer!.removeEventListener('click', handleBackdropClick);
		}
	});
</script>

<svelte:window bind:innerWidth />

{#if toc && toc.length > 0}
	<dialog class="toc" bind:this={tocContainer} class:isOpen>
		<div class="toc__header">
			<h3>Contents</h3>
			<button
				data-icon={isOpen ? 'side_navigation' : 'dock_to_right'}
				aria-label="Toggle Menu"
				class="CrispButton menu-button"
				onclick={toggleOpen}
			>
			</button>
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
	</dialog>
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
	.toc::backdrop {
		backdrop-filter: blur(5px);
	}

	.toc {
		@include box(0);
		flex-shrink: 0;
		margin-right: -2px;
		position: relative;
		background-color: #000;
		transition: all 0.3s ease-in-out;
		@include make-flex($dir: column, $just: flex-start, $align: flex-start);

		.menu-button {
			top: 12px;
			left: 12px;
			z-index: 10;
			// position: absolute;
			border-radius: 4px;
			@include box(35px, 35px);
			@include respondAtOpp(1180px) {
				display: none;
			}
		}

		&.isOpen {
			flex-shrink: 0;
			@include box(100%);
			padding: 0px 10px 0px 0px;

			@include respondAtOpp(1180px) {
				padding: 0px 10px 0px 0px;
			}

			@include respondAt(1180px) {
				transform: translateX(0);
				height: 100vh;
				padding: 10px 10px 0px 10px !important;
			}
		}

		@include respondAtOpp(1180px) {
			&::backdrop {
				display: none;
			}
		}

		@include respondAt(1180px) {
			left: 0;
			top: 0;
			z-index: 100;
			height: 100vh;
			width: 330px;
			position: fixed;
			max-width: unset;
			max-height: unset;
			transform: translateX(-100%);
			padding: 10px 10px 0px 10px !important;
			border-right: 1px solid var(--muted-separator);

			&::backdrop {
				max-width: unset;
				max-height: unset;
				border-radius: 20px;
				@include box(100vw, 100vh);
				background: rgba(0, 0, 0, 0.49);
				box-shadow: 0 0 20px 1px #00000087;
				backdrop-filter: blur(5px) saturate(170%) brightness(1.04);
			}
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

		::-webkit-scrollbar {
			width: 3px;
		}
		::-webkit-scrollbar-thumb {
			background: var(--foreground-tertiary);
		}

		&__nav {
			flex: 1;
			min-height: 0;
			overflow-y: auto;
			padding-right: 9px;
			background-color: #000;

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
		}

		&__item {
			margin-bottom: 4px;

			&--section {
				margin-bottom: 8px;
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
			gap: 8px;
			display: block;
			line-height: 1.4;
			padding: 6px 8px;
			border-radius: 4px;
			text-decoration: none;
			transition: all 0.2s ease;
			color: var(--foreground-secondary);
			@include make-flex($dir: row, $align: flex-start, $just: flex-start);

			&:hover {
				color: var(--background);
				background: var(--foreground-secondary);
			}

			&--active {
				font-weight: 500;
				color: var(--background);
				background: var(--foreground);

				.toc__tag {
					opacity: 0.8;
					color: var(--background);
				}
			}
		}

		&__tag {
			flex-shrink: 0;
			font-size: 12px;
			min-width: 24px;
			font-weight: 600;
			color: var(--foreground-tertiary);
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
