<script lang="ts">
	import { enhance } from '$app/forms';
	import { Chat } from '@ai-sdk/svelte';
	import { marked } from 'marked';
	import type { ActionData } from '../../routes/(app)/app/paper/[id]/$types';
	import { type EmbeddingMessages } from '$lib/RAG/embedWorker';
	import VectorIDB from '$lib/RAG/vdb';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import EmbeddingWorker from '$lib/RAG/embedWorker?worker';
	import type { ProgressInfo } from '@huggingface/transformers';
	import yaml from 'js-yaml';

	let {
		form = $bindable(),
		arxivId
	}: {
		form: ActionData;
		arxivId: string;
	} = $props();
	const chat = new Chat({});

	let vectorDB: VectorIDB;
	let userInput = $state('');
	let embedWorker = $state<Worker | null>(null);

	onMount(() => {
		if (browser) {
			vectorDB = new VectorIDB({
				vectorPath: `paper-embeddings-${arxivId}`,
				distanceFunction: 'cosine',
				dimension: 768
			});

			embedWorker = new EmbeddingWorker();
			embedWorker.onmessage = async (e: MessageEvent<EmbeddingMessages>) => {
				const { command, payload } = e.data;
				switch (command) {
					case 'finishQueryEmbedding': {
						const { query, embedding } = payload;
						// 1. Query vectorDB with embedding
						const results = await vectorDB.query(embedding, 5);
						const searchResults = results.keys.map((key, idx) => ({
							key,
							distance: results.distances[idx],
							metadata: results.metadata[idx] as any
						}));
						chat.sendMessage({
							text: [
								// we use generated rewritten query to search but when we respond we use original user input
								`<user>${userInput}</user>`,
								`<context>${yaml.dump(searchResults.map((result) => result.metadata))}</context>`
							].join('\n')
						});
						userInput = '';
						break;
					}
					case 'progress': {
						const { progress } = payload as {
							requestID: string;
							originalCommand: string;
							progress: ProgressInfo;
						};
						console.log('Embedding Worker Progress:', progress);
						break;
					}
				}
			};
		}
	});

	$effect(() => {
		if (!form?.embeddingsFile) return;
		if (!browser) return;

		(async () => {
			// 1. Check if vectorDB is empty
			// 2. if empty, load embeddings from form.embeddingsFile to vectorDB using vectorDB.insert
			if (await vectorDB.isEmpty()) {
				for (let i = 0; i < form.embeddingsFile.length; i++) {
					await vectorDB.insert(form.embeddingsFile[i].embedding, form.embeddingsFile[i].metadata);
				}
			}
			// 3. Set up embedding worker with requestID as paperId
			// 4. Set up message listener to handle embedding requests (but put it in onMount to avoid multiple listeners)
			if (!embedWorker) return;
			embedWorker.postMessage({
				command: 'init',
				payload: { requestID: arxivId }
			} as EmbeddingMessages);
		})();
	});

	// Flow when user submits a prompt
	// 1. Post request to ?/rewrite route to re-write the prompt
	// 2. Embed it and search in vectorDB
	// 3. Send it to LLM using chat.sendMessage

	$effect(() => {
		if (form?.success) {
			console.log('Rewritten Query:', form.rewrittenQuery);
			if (embedWorker && form.rewrittenQuery) {
				embedWorker.postMessage({
					command: 'startQueryEmbedding',
					payload: { query: userInput, requestID: arxivId }
				} as EmbeddingMessages);
			}
		}
	});
</script>

<div class="ChatContainer">
	<ul>
		{#each chat.messages as message, messageIndex (messageIndex)}
			<li>
				<div>{message.role}</div>
				<div>
					{#each message.parts as part, partIndex (partIndex)}
						{#if part.type === 'text'}
							{#if message.role === 'user'}
								{@html part.text.replace(/<context>[\s\S]*?<\/context>/g, '')}
							{:else}
								{@html marked.parse(part.text)}
							{/if}
						{/if}
					{/each}
				</div>
			</li>
		{/each}
	</ul>
	<form method="post" use:enhance action="?/rewrite">
		<input bind:value={userInput} name="prompt" />
		<button type="submit">Send</button>
	</form>
	<form method="post" action="?/getEmbeddingsFile" use:enhance>
		<button type="submit">Get Embeddings File</button>
	</form>
</div>

<style lang="scss">
	.ChatContainer {
		@include box(100px, 500px);
	}
</style>
