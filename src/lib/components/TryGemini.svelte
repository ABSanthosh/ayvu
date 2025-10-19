<script lang="ts">
</script>

<button aria-label="Toggle AI Chat" class="TryGemini">
	<div class="TryGemini__BG">
		<div class="TryGemini__morph"></div>
	</div>
	<svg focusable="false" viewBox="0 -960 960 960" height="24" width="24" class="TryGemini__icon">
		<path
			d="M480-80q-6,0-11-4t-7-10q-17-67-51-126T328-328T220-411T94-462q-6-2-10-7t-4-11t4-11t10-7q67-17 126-51t108-83t83-108t51-126q2-6 7-10t11-4t10.5,4t6.5,10q18,67 52,126t83,108t108,83t126,51q6,2 10,7t4,11t-4,11t-10,7q-67,17-126,51T632-328T549-220T498-94q-2,6-7,10t-11,4Z"
		>
		</path>
	</svg>
</button>

<style lang="scss">
	.TryGemini {
		--container-size: 35px;
		--bg-size: 44px;
		--icon-size: 26px;

		top: 12px;
		right: 12px;
		z-index: 10;
		border: none;
		outline: none;
		cursor: pointer;
		background: none;
		position: absolute;
		border-radius: 50%;
		@include make-flex();
		@include box(var(--container-size), var(--container-size));

		& > svg {
			z-index: 1;
			fill: white;
			line-height: 0;
			flex-shrink: 0;
			position: absolute;
			display: inline-block;
			height: var(--icon-size);
			width: var(--icon-size);
			transition:
				transform 0.8s,
				color 0.8s;
		}

		&__BG {
			scale: 0.9;
			position: absolute;
			width: var(--bg-size);
			height: var(--bg-size);

			left: calc((var(--container-size) - var(--bg-size)) / 2);
			top: calc((var(--container-size) - var(--bg-size)) / 2);

			animation: rotateFull 7s infinite linear paused;
		}

		&__morph {
			position: absolute;
			width: 100%;
			height: 100%;

			/* Gradient Background Setup */
			background: linear-gradient(135deg, #217bfe, #078efb, #ac87eb, #217bfe);
			background-position: center;
			background-size: 800%; /* For the shimmer effect */

			/* Initial Scale State (0.2) */
			transform: scale(0.2);

			/* Scale Transition (Quick) */
			transition: transform 0.3s cubic-bezier(0, 0, 0, 1);

			/* Morph and Shimmer Animations - Initially Paused */
			animation:
				morph 5s infinite cubic-bezier(0.01, 1.5, 0.63, 0.69) paused,
				feature-shimmer 2.1s linear infinite paused;
		}
	}

	// if .TryGemini is hovered, animate the background and morph
	.TryGemini:hover,
	.TryGemini:focus-visible {
    --icon-size: 22px;
		.TryGemini__morph {
			transform: scale(1);
			animation-play-state: running;
		}

		.TryGemini__BG {
			animation-play-state: running;
		}

		& > svg {
			transform: rotate(180deg);
		}
	}

	@keyframes rotateFull {
		100% {
			transform: rotate(1turn);
		}
	}

	@keyframes morph {
		0%,
		20%,
		25%,
		100% {
			clip-path: path(
				'M29.6119 3.50376C27.9701 2.75188 25.1343 2 22 2C18.8657 2 16.0713 2.85149 14.3881 3.50376C12.4478 4.25564 9.76119 5.90977 7.97015 7.71429C6.1791 9.5188 4.38806 12.0752 3.49254 14.4812C2.73084 16.5277 2 19.7444 2 22.1504C2 24.1053 2.44776 26.9624 3.49254 29.6692C4.17681 31.442 6.08404 34.3854 7.97015 36.2857C9.91045 38.2406 12 39.4026 14.3881 40.4962C16.0299 41.2481 19.1642 42 22 42C24.8358 42 27.6278 41.2959 29.6119 40.4962C32.7463 39.2331 35.1343 37.188 36.0299 36.2857C37.9701 34.3308 39.0896 32.5263 40.209 30.2707C41.2537 28.1654 42 25.0075 42 22.1504C42 19.7444 41.6418 17.3383 40.5075 14.4812C39.4328 11.7744 37.599 9.29521 36.1791 7.86466C34.0896 5.7594 31.6815 4.45156 29.6119 3.50376Z'
			);
		}
		40%,
		45% {
			clip-path: path(
				'M27.4536 4.32973C25.3394 2.50423 23.5376 2 22 2C20.4624 2 18.1238 3.28888 17.363 3.72924C14.8403 5.77091 15.3208 5.17042 12.0773 5.77091C6.91783 6.72615 6.31124 10.4548 5.83073 12.9768C5.35021 15.4989 4.62946 16.2195 3.30805 18.021C0.424997 22.4646 3.0678 25.8274 4.02882 27.0284C4.98984 28.2293 5.47034 28.8298 5.83073 31.9524C6.19111 35.075 9.43455 38.3176 12.0773 38.3176C14.7201 38.3176 16.6422 39.7588 18.2038 40.9598C19.7655 42.1608 23.8498 42.5211 25.7719 40.9598C27.6939 39.3985 28.2945 38.798 32.0185 38.3176C35.7424 37.8372 37.9047 34.5946 38.145 31.9524C38.3372 29.8387 39.5064 27.789 40.067 27.0284C41.3484 25.427 43.2864 21.3837 40.7878 18.021C36.7034 12.8567 39.7066 12.6165 36.8236 8.65328C33.9405 4.69003 30.0964 6.6116 27.4536 4.32973Z'
			);
		}
		60%,
		65% {
			clip-path: path(
				'M31.5444 3.3673C27.9392 1.80933 23.7332 1.86925 22.0808 2.16886C20.2783 2.35735 16.9646 3.71421 15.171 5.01516C13.5186 6.2136 11.2654 8.3608 9.91344 9.80892C9.01215 10.6578 6.57867 13.0747 5.25678 14.7525C3.60442 16.8498 2.25248 20.2953 2.10227 22.5423C1.96096 24.6562 1.80184 27.3361 2.85335 30.482C3.90485 33.6279 5.93025 35.9474 7.05936 37.0734C8.56151 38.5715 10.0318 39.5394 12.9177 40.8186C15.6216 42.017 18.7761 42.1668 21.3298 41.8672C23.8834 41.5676 26.5966 40.6193 28.8405 39.0209C30.9435 37.5228 32.9584 35.3637 34.2482 34.0773C35.3999 32.9288 37.8534 30.6318 38.7547 29.2836C39.7047 27.8624 41.1581 25.838 41.759 22.0929C42.2637 18.947 41.9092 16.4003 41.3083 14.3031C40.7175 12.2407 39.6259 10.1085 38.304 8.46067C37.1023 6.96262 35.3575 5.01516 31.5444 3.3673Z'
			);
		}
		80%,
		85% {
			clip-path: path(
				'M25.4695 2.89888C24.3839 2.29963 23.0856 2 22 2C20.9144 2 19.2875 2.30687 18.232 2.89888C17.0258 3.57545 8.55189 8.50187 6.01877 9.94007C3.48564 11.3783 2.95288 14.6342 3.00314 16.0824C3.0534 17.5306 3.00314 26.2697 3.00314 28.2172C3.00314 30.1648 3.35204 31.5789 4.05862 32.5618C4.81252 33.6105 6.1662 34.3596 7.22502 34.9588C11.1956 37.206 17.7495 41.0112 18.232 41.2509C18.986 41.6255 20.1906 42 22 42C23.8094 42 24.7156 41.5506 25.4695 41.1011C26.2234 40.6517 35.5719 35.7079 36.7781 34.9588C37.9844 34.2097 39.0398 33.4607 39.643 32.5618C40.3121 31.5646 41 30.1648 41 28.2172C41 26.2697 41 19.6779 41 16.0824C41 12.4869 39.0901 10.4894 38.1352 9.94007C34.3656 7.8427 26.5552 3.49813 25.4695 2.89888Z'
			);
		}
	}

	@keyframes feature-shimmer {
		0% {
			background-position: bottom right;
		}
		100% {
			background-position: top left;
		}
	}
</style>
