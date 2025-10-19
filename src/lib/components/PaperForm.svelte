<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { ProcessingStatus } from '$types/SSE.type';
	import { SSEHandler } from '$utils/paperForm/sse-handler';
	import { createErrorHandler, isStreamResponse } from '$utils/paperForm/error-handler';
	import ProgressDisplay from './ProgressDisplay.svelte';

	let { showModal = $bindable() } = $props();

	let formElement: HTMLFormElement;
	let isLoading = $state(false);
	let isSubmitted = $state(false);

	// Error handling
	const errorHandler = createErrorHandler({
		showToasts: true,
		toastType: 'danger'
	});
	let errorState = $state(errorHandler.getState());

	// SSE handling
	let sseHandler: SSEHandler | null = null;
	let progressState = $state({
		progressSteps: {},
		overallStatus: ProcessingStatus.PENDING,
		errorMessage: '',
		isLoading: false
	});

	// Reset form state
	function resetForm() {
		errorHandler.reset();
		errorState = errorHandler.getState();
		progressState = {
			progressSteps: {},
			overallStatus: ProcessingStatus.PENDING,
			errorMessage: '',
			isLoading: false
		};
		isSubmitted = false;
	}

	// Handle form submission
	async function handleSubmit(
		event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }
	) {
		event.preventDefault();

		isLoading = true;
		resetForm();

		const data = new FormData(event.currentTarget, event.submitter);

		try {
			const response = await fetch('/api/paper', {
				method: 'POST',
				body: data
			});

			if (isStreamResponse(response)) {
				await handleStreamingResponse(response);
			} else {
				await handleNonStreamingResponse(response);
			}
		} catch (err) {
			errorHandler.handleGenericError(err, 'Failed to submit form');
			errorState = errorHandler.getState();
			isLoading = false;
		}
	}

	// Handle streaming SSE response
	async function handleStreamingResponse(response: Response) {
		sseHandler = new SSEHandler({
			onProgress: (state) => {
				progressState = state;
			},
			onComplete: () => {
				formElement?.reset();
				isLoading = false;
				isSubmitted = true;
				invalidateAll();
			},
			onError: (state, error) => {
				progressState = state;
				errorHandler.setGeneralError(error);
				errorState = errorHandler.getState();
				isLoading = false;
				showModal = false;
			}
		});

		await sseHandler.handleStreamResponse(response);
	}

	// Handle non-streaming response (usually errors)
	async function handleNonStreamingResponse(response: Response) {
		const wasError = await errorHandler.handleFetchError(response);
		if (wasError) {
			errorState = errorHandler.getState();
			showModal = false;
		}
		isLoading = false;
	}
</script>

<form bind:this={formElement} onsubmit={handleSubmit} class="Papers__newEntryForm">
	<label class="CrispLabel" data-justify="space-between">
		<span data-mandatory style="color: inherit;"> arXiv URL </span>
		<input
			type="url"
			class="CrispInput"
			name="arxivUrl"
			id="arxivUrl"
			placeholder="https://arxiv.org/abs/2411.11908"
			required
			disabled={isLoading}
		/>
		{#if errorState.formErrors.arxivUrl}
			<span class="CrispMessage" data-type="error">
				{errorState.formErrors.arxivUrl}
			</span>
		{/if}
	</label>

	{#if errorState.generalError}
		<span class="CrispMessage" data-type="error">
			{errorState.generalError}
		</span>
	{/if}

	{#if isLoading}
		<ProgressDisplay
			progressSteps={progressState.progressSteps}
			overallStatus={progressState.overallStatus}
			errorMessage={progressState.errorMessage}
		/>
	{/if}

	<button
		class="CrispButton"
		style="margin-left: auto;"
		data-type="invert"
		type="submit"
		disabled={isLoading}
	>
		{#if isLoading}
			Processing...
		{:else}
			Add Paper
		{/if}
	</button>
</form>

<style lang="scss">
	form {
		gap: 20px;
		padding: 7px 20px 20px 20px;
		@include box();
		min-width: 320px;
		@include make-flex();

		@include respondAt(470px) {
			min-width: unset;
		}
	}
</style>
