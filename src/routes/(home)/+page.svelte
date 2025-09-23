<script lang="ts">
	import Header from '$components/Header.svelte';
	import stars2 from '$data/stars2.txt?raw';
	import stars from '$data/stars.txt?raw';

	let innerWidth = $state(0);
	let starsContent = $state(stars2);

	$effect(() => {
		if (innerWidth < 500) {
			starsContent = stars;
		} else {
			starsContent = stars2;
		}
	});
</script>

<svelte:window bind:innerWidth />

<main class="Home">
	<Header />
	<pre class="Home__hero">{@html starsContent}</pre>
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

	:global(.Home__hero) {
		font-family: var(--font-family);
	}

	:global(.Home__hero--title) {
		font-size: 60px;
		font-weight: 500;
		font-family: 'Editorial New', serif;

		transition: font-size 0.3s ease;

		@include respondAt(760px) {
			font-size: 50px;
		}

		@include respondAt(620px) {
			font-size: 40px;
		}

		@include respondAt(460px) {
			font-size: 35px;
		}

		@include respondAt(380px) {
			font-size: 28px;
		}
	}
</style>
