export enum ProcessingStep {
	DOWNLOAD_SOURCE = 'download_source',
	EXTRACT_TARBALL = 'extract_tarball',
	COMPILE_LATEX = 'compile_latex',
	POSTPROCESS = 'postprocess',
	GENERATE_WEIGHTS = 'generate_weights',
	UPLOAD_TO_DRIVE = 'upload_to_drive'
}

export enum ProcessingStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
	FAILED = 'failed'
}

export interface StepProgress {
	status: ProcessingStatus;
	progress?: number; // 0-100 percentage
	message?: string;
	error?: string;
}

export interface ProgressEvent {
	type: 'progress' | 'complete' | 'error';
	data: {
		arxivId: string;
		step?: ProcessingStep;
		progress?: StepProgress;
		steps?: Record<ProcessingStep, StepProgress>;
		overallStatus?: ProcessingStatus;
	};
}
