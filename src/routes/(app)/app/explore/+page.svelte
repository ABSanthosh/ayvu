<span class="App_header">Explore</span>

<style lang="scss">
	.App_header {
		font-size: 22px;
		@include box($height: 60px);
		@include make-flex($dir: row, $just: flex-start);

		&::before {
			content: '';
			@include box(10px, 25px);
			border-left: 3px solid var(--accent-1);
		}
	}
</style>
