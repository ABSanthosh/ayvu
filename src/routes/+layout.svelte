<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import '../styles/root/reset.scss';
	// import '../styles/root/theme.scss';
	import '../styles/root/global.scss';
	import type { LayoutData } from './$types';
	import { ToastStore } from '$lib/stores/ToastStore';
	import Toast from '$components/Toast.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const user = $state(data);
	setContext('user', user);
</script>

{#if $ToastStore}
	{#each $ToastStore as toast (toast.id)}
		<Toast {...toast} />
	{/each}
{/if}

{@render children?.()}
