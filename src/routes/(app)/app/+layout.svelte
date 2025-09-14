<script lang="ts">
	import type { LayoutData } from './$types';
	import type { User } from '$types/User.type';
	import { getContext, type Snippet } from 'svelte';
	import clickOutside from '$directive/clickOutside';
	import ProfileImage from '$components/ProfileImage.svelte';

	const { user }: { user: User } = getContext('user');

	let { children, data }: { children: Snippet; data: LayoutData } = $props();

	let isMenuOpen = $state(false);
</script>

<svelte:head>
	<title>Ayvu</title>
</svelte:head>

<nav class="AppHeader">
	<ul class="AppHeader__nav">
		<h2>
			<a href="/"> Ayvu </a>
		</h2>
		<li>
			<a href="/app" data-active={data.pageTitle === 'Your Reads'}>Your Reads</a>
		</li>
		<li>
			<a href="/app/explore" data-active={data.pageTitle === 'Explore'}>Explore</a>
		</li>
	</ul>
	<details
		class="CrispMenu AppHeader__menu"
		bind:open={isMenuOpen}
		use:clickOutside
		onOutClick={() => (isMenuOpen = false)}
	>
		<summary>Menu</summary>
		<ul class="CrispMenu__content" data-align="right" data-direction="bottom">
			<div class="AppHeader__user">
				<ProfileImage src={user.picture} name={user.name} alt={user.name} />
				<div class="AppHeader__user__info">
					<h3>{user.name}</h3>
					<p>{user.email}</p>
				</div>
			</div>
			<button class="CrispButton w-100">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-settings"
				>
					<path
						d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
					/> <circle cx="12" cy="12" r="3" />
				</svg>
				Settings
			</button>
			<li class="w-100">
				<form hidden action="/auth?/logout" method="POST" id="google-login"></form>
				<button class="CrispButton w-100" data-type="invert" type="submit" form="google-login">
					Log out
				</button>
			</li>
		</ul>
	</details>
</nav>

<span class="AppHeader__pageTitle">
	{data.pageTitle}
</span>

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
			}

			li {
				gap: 8px;
				@include make-flex($dir: row);

				a {
					gap: 5px;
					border: none;
					cursor: pointer;
					user-select: none;
					white-space: nowrap;
					text-decoration: none;
					@include make-flex($dir: row);
					background-color: transparent;
					color: var(--muted-foreground);

					&:hover {
						color: var(--foreground);
					}

					&[data-active='true'] {
						color: var(--foreground);
					}
				}
				&:not(:last-child) {
					&::after {
						content: '|';
						color: var(--muted-separator);
					}
				}

				&:first-child {
					color: var(--accent-1);
				}
			}
		}

		&__menu {
			width: fit-content;
			--crp-menu-min-width: 0;

			@include respondAt(400px) {
				margin-left: auto;
			}
			& > summary {
				--crp-menu-border: 0;
				--crp-menu-border-hover: 0;
				--crp-menu-color: var(--accent-1);
				--crp-menu-summary-padding: 2px 10px;
				--crp-menu-summary-border-radius: 3px;
				@include make-flex($align: flex-end);
			}

			.CrispMenu {
				&__content {
					gap: 10px;
					--crp-menu-content-width: 260px;
					--crp-menu-content-padding: 12px;
					--crp-menu-content-border-radius: 4px;
					--crp-menu-background-color: var(--background);
					--crp-menu-content-border: 1px solid var(--accent-1);

					@include respondAt(400px) {
						--crp-menu-content-width: calc(100vw - 42px);
					}
				}
			}
		}

		&__user {
			gap: 10px;
			@include box();
			max-width: 100%;
			@include make-flex($dir: row, $just: flex-start);

			&__info {
				max-width: 100%;
				user-select: none;
				display: inline-grid;
				@include box($height: 40px);

				h3 {
					font-size: 1rem;
					color: var(--foreground);
				}

				p {
					width: 100%;
					overflow: hidden;
					font-size: 0.8rem;
					white-space: nowrap;
					text-overflow: ellipsis;
					color: var(--muted-foreground);
				}
			}
		}

		&__pageTitle {
			font-size: 22px;
			@include box($height: 60px);
			@include make-flex($dir: row, $just: flex-start);

			&::before {
				content: '';
				@include box(10px, 25px);
				border-left: 3px solid var(--accent-1);
			}
		}
	}
</style>
