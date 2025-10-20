<script lang="ts">
	import yaml from 'js-yaml';
	import { marked } from 'marked';
	import { onMount } from 'svelte';
	import VectorIDB from '$lib/RAG/vdb';
	import { enhance } from '$app/forms';
	import { Chat } from '@ai-sdk/svelte';
	import { browser } from '$app/environment';
	import EmbeddingWorker from '$lib/RAG/embedWorker?worker';
	import type { ProgressInfo } from '@huggingface/transformers';
	import { type EmbeddingMessages } from '$lib/RAG/embedWorker';
	import type { ActionData } from '../../routes/(app)/app/paper/[id]/$types';
	import type { EmbeddingsFile } from '$types/RAG.type';

	let {
		arxivId,
		form = $bindable(),
		isOpen = $bindable(false)
	}: {
		form: ActionData;
		isOpen: boolean;
		arxivId: string;
	} = $props();
	const chat = new Chat({});

	// The flow
	// 1. When user submits a query, we need to do some checks
	// 1.1. Check if vectorDB is empty
	//    a. If empty, fetch embeddings and load into vectorDB
	//    b. If not empty, proceed to rewrite query
	// 2. If worker is not initialized, Load EmbeddingWorker and initialize
	//    else proceed to rewrite query
	// 2.1. Embed the prompt
	// 3. Search the db with the embedded prompt
	// 4. Send chat.sendmessage with the context
	// 5. Display response

	let vectorDB: VectorIDB | null = $state(null);
	let embedWorker = $state<Worker | null>(null);
	let setupProgress = $state<string>('Initializing...');
	let latestUserQuery = $state('');
	let userQueryInput = $state('');

	async function initVectorDB() {
		setupProgress = 'Initializing VectorDB...';
		if (!vectorDB) {
			vectorDB = new VectorIDB({
				vectorPath: `paper-embeddings-${arxivId}`,
				distanceFunction: 'cosine',
				dimension: 768
			});
		}
		setupProgress = 'Loading embeddings...';
		if (await vectorDB.isEmpty()) {
			const response = await fetch('?/getEmbeddingsFile');
			if (response.ok) {
				const embeddingsData: EmbeddingsFile = await response.json();
				for (let i = 0; i < embeddingsData.length; i++) {
					await vectorDB.insert(embeddingsData[i].embedding, embeddingsData[i].metadata);
				}
			}
		}
		setupProgress = 'Embeddings loaded into VectorDB.';
	}

	async function initEmbedWorker() {
		if (embedWorker) {
			setupProgress = 'Embedding worker already initialized.';
			console.log('Embedding worker already initialized.');
			return;
		}
		setupProgress = 'Initializing embedding worker...';
		embedWorker = new EmbeddingWorker();
		// new promise
		const workerInitPromise = new Promise<void>((resolve) => {
			embedWorker?.postMessage({
				command: 'init',
				payload: { requestID: arxivId }
			} as EmbeddingMessages);
			embedWorker!.onmessage = async (e: MessageEvent<EmbeddingMessages>) => {
				const { command, payload } = e.data;
				console.log('EmbedWorker message received:', command);
				switch (command) {
					case 'initFinished': {
						if (payload.requestID === arxivId) {
							setupProgress = 'Embedding worker initialized.';
							resolve();
						}
						break;
					}
					case 'progress': {
						const { progress } = payload as {
							requestID: string;
							originalCommand: string;
							progress: ProgressInfo;
						};
						if (progress.status === 'progress') {
							setupProgress = `Embedding worker init progress: ${(
								(progress.progress / progress.total) *
								100
							).toFixed(2)}%`;
						} else if (progress.status === 'done') {
							setupProgress = 'Embedding worker initialization finished.';
						}
						break;
					}
					case 'finishQueryEmbedding': {
						const { query, embedding } = payload;
						const results = await vectorDB!.query(embedding, 5);
						const searchResults = results.keys.map((key, idx) => ({
							key,
							distance: results.distances[idx],
							metadata: results.metadata[idx] as any
						}));

						setupProgress = 'Sending message to chat...';
						console.log('latestUserQuery:', latestUserQuery, query);
						chat.sendMessage({
							text: [
								// Use the stored current query instead of the cleared userInput
								`<user>${latestUserQuery}</user>`,
								`<context>${yaml.dump(searchResults.map((result) => result.metadata))}</context>`
							].join('\n')
						});
						latestUserQuery = '';
						break;
					}
				}
			};
		});
		await workerInitPromise;
	}

	onMount(async () => {
		await initVectorDB();
		await initEmbedWorker();
	});
</script>

<div class="AIChat" class:AIChat--open={isOpen}>
	<div class="AIChat__content">
		<div class="AIChat__messages">
			{#each chat.messages as message, messageIndex (messageIndex)}
				<div class="AIChat__message AIChat__message--{message.role}">
					<div class="AIChat__message-role">
						{message.role === 'user' ? '>' : '$'}
					</div>
					<div class="AIChat__message-content">
						{#each message.parts as part, partIndex (partIndex)}
							{#if part.type === 'text'}
								{#if message.role === 'user'}
									{@html part.text
										.replace(/<context>[\s\S]*?<\/context>/g, '')
										.replace(/<user>/g, '')
										.replace(/<\/user>/g, '')}
								{:else}
									{@html marked.parse(part.text)}
								{/if}
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
		<form
			method="post"
			action="?/rewrite"
			class="AIChat__input"
			use:enhance={({ formData }) => {
				if (latestUserQuery) formData.set('prompt', latestUserQuery);
				return async ({ update, result }) => {
					console.log('Form submission result:', result);
					if (result.type === 'success') {
						const rewrittenQuery = result.data?.rewrittenQuery;
						if (embedWorker && rewrittenQuery && latestUserQuery) {
							setupProgress = 'Starting query embedding...';
							embedWorker.postMessage({
								command: 'startQueryEmbedding',
								payload: { query: rewrittenQuery, requestID: arxivId }
							} as EmbeddingMessages);
						} else {
							console.log('Cannot start embedding - missing requirements:', {
								hasEmbedWorker: !!embedWorker,
								hasRewrittenQuery: !!rewrittenQuery,
								hasCurrentQuery: !!latestUserQuery
							});
						}
					}
					await update();
				};
			}}
			onsubmit={async (e) => {
				if (userQueryInput.trim() === '') {
					e.preventDefault();
					return false;
				}
				latestUserQuery = userQueryInput.trim();
				userQueryInput = '';
			}}
		>
			<textarea
				id="userQuery"
				name="userQuery"
				class="CrispInput"
				data-type="text-area"
				bind:value={userQueryInput}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						if (userQueryInput.trim()) {
							e.currentTarget.form?.requestSubmit();
						}
					}
				}}
			></textarea>
			<button
				type="button"
				aria-label="Send"
				data-type="invert"
				class="CrispButton"
				data-icon="arrow_upward"
				disabled={userQueryInput.trim().length === 0}
			></button>
		</form>

		{#if setupProgress}
			<div class="AIChat__setup-progress">{setupProgress}</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.AIChat {
		@include box(0);
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
		transition: width 0.3s ease-in-out;
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&--open {
			flex-shrink: 0;
			@include box(336px);
			padding: 0 0 0 12px;

			@include respondAt(1180px) {
				position: fixed;
				top: 0;
				right: 0;
				z-index: 1000;
				@include box(100vw, 100vh);
				padding: 12px;
				background-color: var(--background);
			}

			@include respondAt(768px) {
				padding: 8px;
			}
		}

		&:not(&--open) {
			.AIChat__content {
				transform: translateX(100%);
				opacity: 0;
			}
		}

		&__content {
			@include box();
			@include make-flex($dir: column, $just: flex-start, $align: stretch);
			transition: all 0.3s ease-in-out;
		}

		&__messages {
			gap: 8px;
			flex-grow: 1;
			overflow-y: auto;
			overflow-x: hidden;
			padding-right: 4px;
			@include make-flex($dir: column, $just: flex-start, $align: flex-start);

			&::-webkit-scrollbar {
				width: 4px;
			}

			&::-webkit-scrollbar-track {
				background: transparent;
			}

			&::-webkit-scrollbar-thumb {
				background: var(--muted-foreground-3);
				border-radius: 2px;

				&:hover {
					background: var(--muted-foreground-2);
				}
			}

			// Empty state
			&:empty {
				@include make-flex($dir: column, $just: center, $align: center);
				color: var(--muted-foreground-2);
				font-family: var(--font-family);
				font-size: 14px;

				&::before {
					content: 'Start a conversation about this paper';
				}
			}
		}

		&__message {
			margin-bottom: 16px;
			@include make-flex($dir: row, $just: flex-start, $align: flex-start);
			gap: 8px;

			&--user {
				.AIChat__message-role {
					color: var(--accent-1);
				}
			}

			&--assistant {
				.AIChat__message-role {
					color: var(--link-color);
				}

				.AIChat__message-content {
					:global(p) {
						margin: 0 0 8px 0;
						line-height: 1.4;

						&:last-child {
							margin-bottom: 0;
						}
					}

					// style nested lists
					:global(ul),
					:global(ol) {
						margin: 0 0 8px 16px;
					}

					:global(code) {
						background-color: var(--elevation-1);
						padding: 2px 4px;
						border-radius: 2px;
						font-family: var(--font-family);
						font-size: 14px;
					}

					:global(pre) {
						background-color: var(--elevation-1);
						padding: 12px;
						border-radius: 4px;
						overflow-x: auto;
						margin: 8px 0;

						:global(code) {
							background-color: transparent;
							padding: 0;
						}
					}
				}
			}
		}

		&__message-role {
			font-family: var(--font-family);
			font-weight: var(--font-weight-bold);
			font-size: 16px;
			line-height: 1.4;
			width: 16px;
			flex-shrink: 0;
		}

		&__message-content {
			flex: 1;
			font-family: var(--font-family);
			font-size: 14px;
			color: var(--foreground);
			line-height: 1.4;
			word-wrap: break-word;
		}

		&__input {
			position: relative;
			border-radius: 6px;
			@include make-flex();
			@include box(100%, auto);
			border: 1px solid var(--muted-separator);

			& > textarea {
				resize: none;
				border-radius: inherit;
			}

			& > .CrispButton {
				padding: 0;
				right: 7px;
				top: 7px;
				position: absolute;
				border-radius: 50%;
				@include box(35px, 35px);

				&::before {
					color: var(--background) !important;
				}
			}
		}
	}
</style>
