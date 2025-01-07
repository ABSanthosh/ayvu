<script lang="ts">
	import Header from '$components/Header.svelte';
	import stars from '$data/stars.txt?raw';
</script>

<main class="Home">
	<Header />
	<pre class="Home__hero">{@html stars}</pre>
</main>

<style lang="scss">
	.Home {
		gap: 15px;
		@include make-flex();

		&__hero {
			@include box();
			overflow: hidden;
		}
	}

	:global(.Home__hero--title) {
		font-size: 28px;
		font-weight: 500;

		@include respondAt(460px) {
			font-size: 23px;
		}

		@include respondAt(380px) {
			font-size: 20px;
		}
	}
</style>
