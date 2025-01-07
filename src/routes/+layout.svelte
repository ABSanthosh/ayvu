<script lang="ts">
	// import '../styles/root/_mixins.scss';
	import '../styles/root/global.scss';
	import '../styles/root/reset.scss';

	let { children } = $props();
</script>

{@render children?.()}
