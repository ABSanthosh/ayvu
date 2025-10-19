<script lang="ts">
	import {
		ProcessingStatus,
		ProcessingStep,
		type StepProgress
	} from '$types/SSE.type';

	let {
		progressSteps = {},
		overallStatus = ProcessingStatus.PENDING,
		errorMessage = ''
	}: {
		progressSteps: Partial<Record<ProcessingStep, StepProgress>>;
		overallStatus: ProcessingStatus;
		errorMessage: string;
	} = $props();

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
</script>

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

<style lang="scss">
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