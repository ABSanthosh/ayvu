<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import '../styles/root/reset.scss';
	import '../styles/root/global.scss';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const user = $state(data);
	setContext('user', user);
</script>

{@render children?.()}
