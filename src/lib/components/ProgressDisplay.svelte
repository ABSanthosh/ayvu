<script lang="ts">
	import { ProcessingStatus, ProcessingStep, type StepProgress } from '$types/SSE.type';
	import Spinner from './Spinner/Spinner.svelte';

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

	// Get the current message from active or latest step
	const currentMessage = $derived.by(() => {
		const steps = Object.values(progressSteps);
		const activeStep = steps.find((step) => step.status === ProcessingStatus.IN_PROGRESS);
		if (activeStep?.message) return activeStep.message;

		const latestStep = [...steps].reverse().find((step) => step.message);
		return latestStep?.message || errorMessage || '';
	});
</script>

<div class="progress-container">
	<ul class="step-list">
		{#each Object.entries(progressSteps) as [step, stepProgress] (step)}
			<li class="step-item">
				<div class="step-icon">
					{#if stepProgress.status === ProcessingStatus.COMPLETED}
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#28a745"
							stroke-width="2"
						>
							<polyline points="20,6 9,17 4,12"></polyline>
						</svg>
					{:else if stepProgress.status === ProcessingStatus.IN_PROGRESS}
						<Spinner height={14} width={14} />
					{:else if stepProgress.status === ProcessingStatus.FAILED}
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#dc3545"
							stroke-width="2"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					{:else}
						<div class="pending-dot"></div>
					{/if}
				</div>
				<span
					class="step-text"
					class:completed={stepProgress.status === ProcessingStatus.COMPLETED}
					class:failed={stepProgress.status === ProcessingStatus.FAILED}
				>
					{formatStepName(step)}
				</span>
			</li>
		{/each}
	</ul>

	{#if currentMessage}
		<div class="current-message">{currentMessage}</div>
	{/if}
</div>

<style lang="scss">
	.progress-container {
		width: 100%;
		font-size: 15px;
	}

	.step-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 6px;
	}

	.step-icon {
		width: 12px;
		height: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.pending-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #e4a609;
	}

	.step-text {
		color: #dcdcdc;
		transition: color 0.3s ease;

		&.completed {
			color: #999;
		}

		&.failed {
			color: #dc3545;
		}
	}

	.current-message {
		margin-top: 12px;
		font-size: 16px;
		color: #cdcdcd;
		font-style: italic;
	}
</style>
