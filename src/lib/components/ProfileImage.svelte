<script lang="ts">
	let { name, src, alt }: { name: string; src: string | null; alt: string } = $props();

	let profile = () =>
		(name ? name : '')
			.match(/(\b\S)?/g)!
			.join('')
			.match(/(^\S|\S$)?/g)!
			.join('')
			.toUpperCase();
</script>

<span class="ProfileImage">
	<h2>
		{profile()}
	</h2>
	{@html `
    <img 
      src="${src}" 
      alt="${alt}" 
      loading="lazy" 
      onerror="this.style.visibility = 'hidden'" 
    />
  `}
</span>

<style lang="scss">
	.ProfileImage {
		h2 {
			flex-shrink: 0;
			@include box();
			line-height: 42px;
			border-radius: 3px;
			text-align: center;
			@include make-flex();
      background-color: var(--accent-1);
		}

		gap: 10px;
		position: relative;
		aspect-ratio: 1 / 1;
		@include box(42px, 42px);
		@include make-flex($dir: column, $just: flex-start, $align: flex-start);

		:global(img) {
			top: 0;
			right: 0;
			border-radius: 3px;
			position: absolute;
		}
	}
</style>
