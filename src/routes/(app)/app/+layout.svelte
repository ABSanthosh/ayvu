<script lang="ts">
	import type { User } from '$types/User.type';
	import { getContext, type Snippet } from 'svelte';

	const { user }: { user: User } = getContext('user');

	let { children }: { children: Snippet } = $props();
</script>

hello there
<form hidden action="/auth?/logout" method="POST" id="google-login"></form>
<button type="submit" form="google-login">Log out</button>

{@render children?.()}
