<script lang="ts">
	import { applyAction, deserialize, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { type ActionResult } from '@sveltejs/kit';

	let { showModal = $bindable() } = $props();

	enum ProcessingStep {
		DOWNLOAD_SOURCE = 'download_source',
		EXTRACT_TARBALL = 'extract_tarball',
		COMPILE_LATEX = 'compile_latex',
		POSTPROCESS = 'postprocess',
		CLEANUP_HTML = 'cleanup_html',
		GENERATE_WEIGHTS = 'generate_weights',
		UPLOAD_TO_DRIVE = 'upload_to_drive'
	}

	enum ProcessingStatus {
		PENDING = 'pending',
		IN_PROGRESS = 'in_progress',
		COMPLETED = 'completed',
		FAILED = 'failed'
	}

	interface StepProgress {
		status: ProcessingStatus;
		progress?: number; // 0-100 percentage
		message?: string;
		error?: string;
	}

	interface ProgressEvent {
		type: 'progress' | 'complete' | 'error';
		data: {
			arxivId: string;
			step?: ProcessingStep;
			progress?: StepProgress;
			steps?: Record<ProcessingStep, StepProgress>;
			overallStatus?: ProcessingStatus;
		};
	}

	let formElement: HTMLFormElement;
	let formLoading = $state(false);
	let formErrors = $state({ arxivUrl: '' });
	let progressSteps = $state<Record<ProcessingStep, StepProgress>>({
		[ProcessingStep.DOWNLOAD_SOURCE]: { status: ProcessingStatus.PENDING },
		[ProcessingStep.EXTRACT_TARBALL]: { status: ProcessingStatus.PENDING },
		[ProcessingStep.COMPILE_LATEX]: { status: ProcessingStatus.PENDING },
		[ProcessingStep.POSTPROCESS]: { status: ProcessingStatus.PENDING },
		[ProcessingStep.GENERATE_WEIGHTS]: { status: ProcessingStatus.PENDING },
		[ProcessingStep.UPLOAD_TO_DRIVE]: { status: ProcessingStatus.PENDING }
	});
	let overallStatus = $state<ProcessingStatus>(ProcessingStatus.PENDING);
	let errorMessage = $state('');

	// $inspect(progressSteps)

	// Helper function to format step names for display
	function formatStepName(step: string): string {
		const stepNameMap: Record<ProcessingStep, string> = {
			[ProcessingStep.DOWNLOAD_SOURCE]: 'Download Source',
			[ProcessingStep.EXTRACT_TARBALL]: 'Extract Files',
			[ProcessingStep.COMPILE_LATEX]: 'Compile LaTeX',
			[ProcessingStep.POSTPROCESS]: 'Post Process',
			[ProcessingStep.GENERATE_WEIGHTS]: 'Generate Weights',
			[ProcessingStep.UPLOAD_TO_DRIVE]: 'Upload to Drive'
		};
		return (
			stepNameMap[step as ProcessingStep] ||
			step.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
		);
	}

	async function handleStreamResponse(response: Response) {
		if (!response.body) {
			errorMessage = 'No response body received';
			formLoading = false;
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				let lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						try {
							const event: ProgressEvent = JSON.parse(line.slice(6));

							if (event.type === 'progress') {
								// Handle progress updates
								if (event.data.step && event.data.progress) {
									// Update specific step progress
									progressSteps = {
										...progressSteps,
										[event.data.step]: event.data.progress
									};
								}

								// Update overall progress if steps are provided
								if (event.data.steps) {
									progressSteps = { ...progressSteps, ...event.data.steps };
								}

								// Update overall status
								if (event.data.overallStatus) {
									overallStatus = event.data.overallStatus;
								}
							} else if (event.type === 'success' || event.type === 'complete') {
								formErrors = { arxivUrl: '' };
								if (formElement) formElement.reset();
								formLoading = false;
                
								overallStatus = ProcessingStatus.COMPLETED;
								invalidateAll(); // Refresh the data
								break;
							} else if (event.type === 'error') {
								errorMessage = event.data.progress?.error || 'Processing failed';
								formLoading = false;
								overallStatus = ProcessingStatus.FAILED;
								break;
							}
						} catch (e) {
							console.error('Failed to parse SSE data:', e);
						}
					}
				}
			}
		} catch (err) {
			console.error('Stream reading error:', err);
			errorMessage = 'Connection to server lost';
			formLoading = false;
		}
	}
</script>

<form
	bind:this={formElement}
	onsubmit={async (event: SubmitEvent & { currentTarget: EventTarget & HTMLFormElement }) => {
		event.preventDefault();
		formLoading = true;
		formErrors = { arxivUrl: '' };
		progressSteps = {};
		overallStatus = ProcessingStatus.PENDING;
		errorMessage = '';

		const data = new FormData(event.currentTarget, event.submitter);

		try {
			const response = await fetch('/api/paper', {
				method: 'POST',
				body: data
			});

			// Check if the response is an SSE stream (text/event-stream)
			const contentType = response.headers.get('content-type');
			if (contentType?.includes('text/event-stream')) {
				// Handle the streaming response
				await handleStreamResponse(response);
			} else {
				// Handle non-streaming responses (errors, etc.)
				const result: ActionResult = deserialize(await response.text());

				if (result.type === 'failure') {
					if (result.data?.error) {
						formErrors = { arxivUrl: '', ...result.data.error };
					}
				} else if (result.type === 'error') {
					errorMessage = result.error?.message || 'An error occurred';
				}
				formLoading = false;
			}
		} catch (err) {
			console.error('Form submission error:', err);
			errorMessage = 'Failed to submit form';
			formLoading = false;
		}
	}}
	class="Papers__newEntryForm"
>
	<label class="CrispLabel" data-justify="space-between">
		<span data-mandatory style="color: inherit;"> arXiv URL </span>
		<input
			type="url"
			class="CrispInput"
			name="arxivUrl"
			id="arxivUrl"
			placeholder="https://arxiv.org/abs/2411.11908"
			required
			disabled={formLoading}
		/>
		{#if formErrors.arxivUrl !== ''}
			<span class="CrispMessage" data-type="error">
				{formErrors.arxivUrl}
			</span>
		{/if}
	</label>

	{#if formLoading}
		<div class="progress-container">
			<h3>Processing Status: {overallStatus.replace('_', ' ').toUpperCase()}</h3>

			{#each Object.entries(progressSteps) as [step, stepProgress]}
				<div class="progress-step">
					<div class="step-header">
						<strong>{formatStepName(step)}</strong>
						<span
							class="status-badge"
							class:completed={stepProgress.status === ProcessingStatus.COMPLETED}
							class:in-progress={stepProgress.status === ProcessingStatus.IN_PROGRESS}
							class:failed={stepProgress.status === ProcessingStatus.FAILED}
						>
							{stepProgress.status.replace('_', ' ')}
						</span>
					</div>

					{#if stepProgress.progress !== undefined}
						<div class="progress-bar">
							<div class="progress-fill" style="width: {stepProgress.progress}%"></div>
							<span class="progress-text">{stepProgress.progress}%</span>
						</div>
					{/if}

					{#if stepProgress.message}
						<div class="step-message">{stepProgress.message}</div>
					{/if}

					{#if stepProgress.error}
						<div class="step-error">{stepProgress.error}</div>
					{/if}
				</div>
			{/each}

			{#if errorMessage}
				<span class="CrispMessage" data-type="error">{errorMessage}</span>
			{/if}
		</div>
	{/if}

	<button
		class="CrispButton"
		style="margin-left: auto;"
		data-type="invert"
		type="submit"
		disabled={formLoading}
	>
		{#if formLoading}
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

	.progress-container {
		@include make-flex();
		gap: 15px;
		margin: 10px 0;

		h3 {
			margin: 0;
			color: #e9e9e9ff;
			font-size: 1.1em;
		}
	}

	.progress-step {
		@include make-flex();
		gap: 8px;
		padding: 12px;
		background: #f8f9fa;
		border-radius: 6px;
		border-left: 3px solid #e9ecef;

		&:has(.status-badge.in-progress) {
			border-left-color: #007bff;
			background: #f0f8ff;
		}

		&:has(.status-badge.completed) {
			border-left-color: #28a745;
			background: #f0fff4;
		}

		&:has(.status-badge.failed) {
			border-left-color: #dc3545;
			background: #fff5f5;
		}
	}

	.step-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.status-badge {
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.8em;
		font-weight: 500;
		text-transform: capitalize;
		background: #e9ecef;
		color: #6c757d;

		&.in-progress {
			background: #cce7ff;
			color: #0056b3;
		}

		&.completed {
			background: #d4edda;
			color: #155724;
		}

		&.failed {
			background: #f8d7da;
			color: #721c24;
		}
	}

	.progress-bar {
		position: relative;
		width: 100%;
		height: 8px;
		background: #e9ecef;
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #007bff, #0056b3);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		position: absolute;
		right: 0;
		top: -20px;
		font-size: 0.8em;
		color: #6c757d;
	}

	.step-message {
		font-size: 0.9em;
		color: #6c757d;
		font-style: italic;
	}

	.step-error {
		font-size: 0.9em;
		color: #dc3545;
		font-weight: 500;
	}
</style>
