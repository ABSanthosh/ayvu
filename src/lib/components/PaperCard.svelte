<script lang="ts">
	let {
		type,
		title,
		authors,
		published,
		abstract,
		preview: previewUrl
	}: {
		type: 'Desc' | 'No-Preview' | 'Table';
		title: string;
		authors: string[];
		published: string;
		abstract: string;
		preview: string;
	} = $props();

	import preview from '../data/preview.png';
</script>

{#snippet Content(title: string, authors: any[], published: string)}
	<a class="PaperCard__title" href="/">
		<h2>{title}</h2>
	</a>
	<p class="PaperCard__meta">
		{published} •
		{authors.slice(0, 2).join(', ') + (authors.length > 2 ? `, ${authors.length - 2}+` : '')}
	</p>
{/snippet}

<div class="PaperCard" data-type={type}>
	{#if type === 'Desc'}
		<img class="PaperCard__preview" src={preview} alt="Preview" />
	{/if}
	{#if type === 'Table'}
		{@render Content(title, authors, published)}
	{:else}
		<div class="PaperCard__content">
			{@render Content(title, authors, published)}
			<p class="PaperCard__abstract">{abstract}</p>
		</div>
	{/if}
</div>

<style lang="scss">
	.PaperCard {
		&__content {
			gap: 12px;
			@include box(100%, auto);
			@include make-flex($dir: column, $align: flex-start);
		}

		&__preview {
			object-fit: cover;
			border-radius: var(--border-radius);
			@include box(auto, 200px);

			@include respondAt(525px) {
				display: none;
			}
		}

		&__title {
			color: var(--foreground);
			&:hover {
				color: var(--link-hover-color);
			}
			& > h2 {
				font-size: 20px;
				font-weight: 600;
				line-height: 1.3;

				@include clamp(2);
				@include respondAt(525px) {
					font-size: 18px;
				}
			}
		}

		&__meta {
			font-size: 14px;
			color: var(--muted-foreground-2);
		}

		&__abstract {
			font-size: 16px;
			color: var(--muted-foreground);
			line-height: 1.3;

			@include clamp(4);
			@include respondAt(525px) {
				-webkit-line-clamp: 3;
				font-size: 14px;
			}
		}

		&[data-type='Desc'],
		&[data-type='No-Preview'] {
			gap: 20px;
			@include box(100%, auto);
			@include make-flex($dir: row, $align: flex-start);
		}

		&[data-type='Table'] {
			gap: 10px;
			@include box(100%, auto);
			@include make-flex($align: flex-start);
		}
	}
</style>
