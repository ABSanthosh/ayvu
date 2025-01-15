<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		type,
		header,
		children,
		showModal = $bindable()
	}: {
		type: string;
		header: string;
		children: Snippet;
		showModal: boolean;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (dialog && showModal) dialog.showModal();
	});
</script>

{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
	<dialog
		class="Modal"
		bind:this={dialog}
		onclose={() => (showModal = false)}
		onclick={(e) => {
			if (e.target === dialog) dialog.close();
		}}
	>
		<div class="Modal__content" data-type={type}>
			<header>
				<h3>
					{header}
				</h3>
				<hr />
				<!-- svelte-ignore a11y_autofocus -->
				<button
					class="CrispButton"
					autofocus
					data-type="X"
					data-no-hover
					onclick={() => dialog!.close()}
				>
					[x]
				</button>
			</header>
			<article>
				{@render children?.()}
			</article>
		</div>
	</dialog>
{/if}

<style lang="scss">
	.Modal {
		padding: 0;
		border: none;
		color: inherit;
		position: fixed;
		@include make-flex();
		background: transparent;
		@include box(100vw, 100vh);

		&::backdrop {
			backdrop-filter: blur(5px);
			background: var(--modal-blur-bg);
		}

		&:-internal-dialog-in-top-layer {
			max-width: unset;
			max-height: unset;
		}

		&__content {
			display: none;
			padding: 20px;
			background-color: transparent;
			background-color: var(--modal-bg);
			border: 1px solid var(--secondary);
			box-shadow: var(--t-crp-box-shadow);

			&[data-type='min-size'] {
				@include box(min(calc(100vw - 50px), 80vh), 530px);
			}

			& > header {
				--__offset: 0.03fr;
				display: grid;
				align-items: end;
				@include box(100%, auto);
				grid-template-columns: var(--__offset) auto 1fr auto var(--__offset);

				& > h3 {
					@include box(auto);
					@include make-flex();
					padding: 0 12px;
					white-space: nowrap;
				}

				&::before,
				&::after {
					content: '';
					@include box($height: 16px);
				}

				&::before {
					border-top: var(--border-thickness) solid var(--foreground);
					border-left: var(--border-thickness) solid var(--foreground);
				}
				&::after {
					border-top: var(--border-thickness) solid var(--foreground);
					border-right: var(--border-thickness) solid var(--foreground);
				}

				& > hr {
					border: 0;
					@include make-flex();
					@include box();
					&::after {
						content: '';
						@include box($height: 2px);
						box-shadow: rgb(255, 255, 255) 0px 2px 0px 0px inset;
					}
				}
			}

			& > article {
				@include box();
				@include make-flex();
				border: var(--border-thickness) solid var(--foreground);
				border-top: 0;
				// box-shadow:
				// 	rgb(255, 255, 255) 2px 0px 0px 0px inset,
				// 	rgb(255, 255, 255) -2px 0px 0px 0px inset,
				// 	rgb(255, 255, 255) 0px -2px 0px 0px inset;
			}
		}

		&[open] {
			animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
		}

		&[open] > &__content {
			@include make-flex();
		}
	}

	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
