<nav class="Header">
	<h2>Ayvu</h2>
	<ul class="Header__nav">
		<li>
			<a href="features">Features</a>
			<a href="about">About</a>
			<a href="sign-up">Get Started</a>
		</li>
	</ul>
</nav>

<style lang="scss">
	.Header {
		gap: 10px;
		@include box($height: 60px);
		@include make-flex($dir: row, $just: space-between);
		// border-bottom: var(--border-thickness) solid var(--foreground);

		@include respondAt(400px) {
			flex-direction: column;
			height: auto;
			padding: 10px 0;
		}

		h2 {
			@include respondAt(400px) {
				margin-right: auto;
			}
		}

		&__nav {
			list-style: none;
			@include make-flex();

			@include respondAt(400px) {
				margin-left: auto;
			}

			li {
				gap: 5px;
				@include make-flex($dir: row);

				a {
					gap: 5px;
					text-decoration: none;
					@include make-flex($dir: row);
					color: var(--muted-foreground);

					&:hover {
						color: var(--foreground);
					}

					&:not(:last-child) {
						&::after {
							content: '|';
							color: var(--muted-separator);
						}
					}

					&:last-child {
						color: var(--accent-1);
					}
				}
			}
		}
	}
</style>
