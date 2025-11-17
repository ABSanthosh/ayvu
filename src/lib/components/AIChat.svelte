<script lang="ts">
	import yaml from 'js-yaml';
	import { marked } from 'marked';
	import { getContext, onMount } from 'svelte';
	import VectorIDB from '$lib/RAG/vdb';
	import { enhance } from '$app/forms';
	import { Chat } from '@ai-sdk/svelte';
	import EmbeddingWorker from '$lib/RAG/embedWorker?worker';
	import type { ProgressInfo } from '@huggingface/transformers';
	import { type EmbeddingMessages } from '$lib/RAG/embedWorker';
	import type { ActionData } from '../../routes/(app)/app/paper/[id]/$types';
	import type { EmbeddingsFile } from '$types/RAG.type';

	let {
		arxivId,
		abstract,
		form = $bindable()
	}: {
		form: ActionData;
		arxivId: string;
		abstract: string;
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

	let isOpen = getContext<{ default: boolean }>('isAIChatOpen');
	let vectorDB: VectorIDB | null = $state(null);
	let embedWorker = $state<Worker | null>(null);
	let setupProgress = $state<string>('Initializing...');
	let latestUserQuery = $state('');
	let userQueryInput = $state('');

	let AIContainer = $state<HTMLDialogElement>();
	let innerWidth = $state(0);

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
			// console.log('Embedding worker already initialized.');
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
				// console.log('EmbedWorker message received:', command);
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
						// console.log('latestUserQuery:', latestUserQuery, query);
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

	function toggleOpen() {
		isOpen.default = !isOpen.default;
	}

	onMount(async () => {
		await initVectorDB();
		await initEmbedWorker();
	});

	$effect(() => {
		if (innerWidth >= 1180) {
			if (AIContainer && AIContainer.open) {
				AIContainer.close();
			}
		}
	});

	$effect(() => {
		if (AIContainer && innerWidth < 1180) {
			if (isOpen.default) {
				AIContainer.showModal();
			} else {
				AIContainer.close();
			}
		}
	});

	$effect(() => {
		if (AIContainer && innerWidth < 1180) {
			const handleBackdropClick = (e: MouseEvent) => {
				const rect = AIContainer!.getBoundingClientRect();
				if (
					e.clientX < rect.left ||
					e.clientX > rect.right ||
					e.clientY < rect.top ||
					e.clientY > rect.bottom
				) {
					toggleOpen();
				}
			};

			AIContainer.addEventListener('click', handleBackdropClick);
			return () => AIContainer!.removeEventListener('click', handleBackdropClick);
		}
	});
</script>

<svelte:window bind:innerWidth />

<dialog class="AIChat" class:isOpen={isOpen.default} bind:this={AIContainer}>
	<div class="AIChat__top-section">
		<button
			type="button"
			aria-label="Clear"
			class="CrispButton"
			data-icon="refresh"
			onclick={() => {}}
		></button>
		<button
			type="button"
			aria-label="Close"
			class="CrispButton"
			data-icon="close"
			onclick={() => (isOpen.default = false)}
		></button>
	</div>
	<div class="AIChat__content">
		<div class="AIChat__messages">
			{#each chat.messages as message, messageIndex (messageIndex)}
				<div class="AIChat__message AIChat__message--{message.role}">
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
			{:else}
				<div class="AIChat__empty-state">
					{#if setupProgress}
						<div class="AIChat__setup-progress">{setupProgress}</div>
					{:else}
						<div class="AIChat__empty-message">
							<span>Build with agent mode.</span>
							<small>AI responses may be inaccurate.</small>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
	<div class="AIChat__bottom-section">
		<form
			method="post"
			action="?/rewrite"
			class="AIChat__input"
			use:enhance={({ formData }) => {
				if (latestUserQuery) formData.set('prompt', latestUserQuery);
				formData.set('abstract', abstract);
				return async ({ update, result }) => {
					if (result.type === 'success') {
						const rewrittenQuery = result.data?.rewrittenQuery;
						if (embedWorker && rewrittenQuery && latestUserQuery) {
							setupProgress = 'Starting query embedding...';
							embedWorker.postMessage({
								command: 'startQueryEmbedding',
								payload: { query: rewrittenQuery, requestID: arxivId }
							} as EmbeddingMessages);
						} else {
							// console.log('Cannot start embedding - missing requirements:', {
							// 	hasEmbedWorker: !!embedWorker,
							// 	hasRewrittenQuery: !!rewrittenQuery,
							// 	hasCurrentQuery: !!latestUserQuery
							// });
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
				placeholder="Ask a question"
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
				type="submit"
				data-icon="send"
				aria-label="Send"
				class="CrispButton"
				disabled={userQueryInput.trim().length === 0}
			></button>
		</form>
	</div>
</dialog>

<style lang="scss">
	.AIChat {
		@include box(0);
		flex-shrink: 0;
		border: none;
		color: inherit;
		overflow: hidden;
		position: relative;
		background-color: #1a1a1a;
		// transition: width 0.3s ease-in-out;
		@include make-flex($dir: column, $just: flex-start, $align: stretch);

		&::backdrop {
			backdrop-filter: blur(5px);
		}

		&.isOpen {
			flex-shrink: 0;
			overflow-x: hidden;
			// padding: 10px 10px 10px 10px;
			border-left: 1px solid var(--muted-separator);

			@include respondAtOpp(1180px) {
				@include box(100%);
				// padding: 10px 10px 10px 10px;
			}

			@include respondAt(1180px) {
				// transform: translateX(0);
				height: 100vh;
				transform: translateX(0);
				// padding: 10px 10px 0px 10px !important;
			}
		}

		&:not(&.isOpen) {
			width: 0;
			.AIChat__content {
				transform: translateX(100%);
				opacity: 0;
			}
		}

		@include respondAtOpp(1180px) {
			&::backdrop {
				display: none;
			}
		}

		@include respondAt(1180px) {
			top: 0;
			z-index: 100;
			height: 100vh;
			width: 330px;
			position: fixed;
			max-width: unset;
			max-height: unset;
			margin-left: auto;
			transform: translateX(100%);
			// padding: 10px 10px 0px 10px !important;
			border-right: 1px solid var(--muted-separator);

			&::backdrop {
				max-width: unset;
				max-height: unset;
				border-radius: 20px;
				@include box(100vw, 100vh);
				background: rgba(0, 0, 0, 0.49);
				box-shadow: 0 0 20px 1px #00000087;
				backdrop-filter: blur(5px) saturate(170%) brightness(1.04);
			}
		}

		&__content {
			flex-grow: 1;
			overflow-y: auto;
			@include make-flex($dir: column, $just: flex-start, $align: stretch);
			transition: all 0.3s ease-in-out;
		}

		&__top-section {
			padding: 8px;
			border-bottom: 1px solid var(--muted-separator);
			@include make-flex($just: flex-end, $align: center, $dir: row);
			gap: 8px;

			.CrispButton {
				@include box(24px, 24px);
				padding: 4px;
				border-radius: 4px;

				&::before {
					font-size: 16px;
				}
			}
		}

		&__bottom-section {
			padding: 8px;
			// border-top: 1px solid var(--muted-separator);
		}

		&__empty-state {
			position: absolute;
			@include make-flex($dir: column, $just: center, $align: center);
			flex-grow: 1;
			margin: auto;
			left: 0;
			text-align: center;
		}

		&__empty-message {
			@include make-flex($dir: column, $just: center, $align: center);
			gap: 4px;
			span {
				color: var(--muted-foreground-2);
				font-family: var(--font-family);
				font-size: 14px;
			}
			small {
				font-size: 12px;
				color: var(--muted-foreground-3);
			}
		}

		&__messages {
			gap: 8px;
			flex-grow: 1;
			overflow-y: auto;
			overflow-x: hidden;
			padding: 8px;
			position: relative;
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

			&__setup-progress {
				color: var(--muted-foreground-2);
				font-family: var(--font-family);
				font-size: 14px;
			}
		}
		&__message {
			border-radius: 8px;
			// margin-bottom: 16px;
			width: fit-content;

			&--user {
				max-width: 95%;
				padding: 8px 12px;
				background-color: #0b57d0;
				align-self: flex-end;
				border-radius: 12px 12px 2px 12px;
				.AIChat__message-content {
					color: #fff;
				}
			}

			&--assistant {
				padding: 5px;
				background-color: var(--elevation-1);
				border-radius: 12px 12px 12px 2px;

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
						background-color: var(--elevation-2);
						padding: 2px 4px;
						border-radius: 2px;
						font-family: var(--font-family);
						font-size: 14px;
					}

					:global(pre) {
						background-color: var(--elevation-2);
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
			border-radius: 8px;
			@include make-flex($align: flex-end);
			@include box(100%, auto);
			border: 1px solid var(--muted-separator);
			// padding: 8px;
			// gap: 8px;

			& > textarea {
				border-radius: inherit;
				background-color: transparent;
				color: var(--foreground);
				border: none;
				padding: 8px 8px 35px;
				outline: none;
				border: none !important;
				resize: none;
				min-height: 24px;
				max-height: 200px;
				line-height: 1.5;

				&::placeholder {
					color: var(--muted-foreground-2);
				}
			}

			& > .CrispButton {
				padding: 0;
				border-radius: 4px;
				@include box(24px, 24px);
				flex-shrink: 0;

				position: absolute;
				bottom: 5px;
				right: 5px;

				&::before {
					font-size: 16px;
				}
			}
		}
	}
</style>
