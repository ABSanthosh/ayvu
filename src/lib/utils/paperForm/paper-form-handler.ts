import { invalidateAll } from '$app/navigation';
import { SSEHandler, type SSECallbacks } from './sse-handler';
import { createErrorHandler, isStreamResponse } from './error-handler';
import { ProcessingStatus } from '$types/SSE.type';

export interface PaperFormState {
	isLoading: boolean;
	errorState: {
		formErrors: { [key: string]: string };
		generalError: string;
	};
	progressState: {
		progressSteps: any;
		overallStatus: ProcessingStatus;
		errorMessage: string;
		isLoading: boolean;
	};
}

export interface PaperFormCallbacks {
	onSuccess?: () => void;
	onError?: (error: string) => void;
	onProgress?: (state: any) => void;
}

export function createPaperFormHandler(callbacks: PaperFormCallbacks = {}) {
	const errorHandler = createErrorHandler();
	let sseHandler: SSEHandler | null = null;

	let state: PaperFormState = $state({
		isLoading: false,
		errorState: errorHandler.getState(),
		progressState: {
			progressSteps: {},
			overallStatus: ProcessingStatus.PENDING,
			errorMessage: '',
			isLoading: false
		}
	});

	function resetState() {
		errorHandler.reset();
		state.errorState = errorHandler.getState();
		state.progressState = {
			progressSteps: {},
			overallStatus: ProcessingStatus.PENDING,
			errorMessage: '',
			isLoading: false
		};
	}

	async function submitForm(formData: FormData, formElement?: HTMLFormElement): Promise<void> {
		state.isLoading = true;
		resetState();

		try {
			const response = await fetch('/api/paper', {
				method: 'POST',
				body: formData
			});

			if (isStreamResponse(response)) {
				await handleStreamingResponse(response, formElement);
			} else {
				await handleNonStreamingResponse(response);
			}
		} catch (err) {
			errorHandler.handleGenericError(err, 'Failed to submit form');
			state.errorState = errorHandler.getState();
			state.isLoading = false;
			if (callbacks.onError) callbacks.onError(errorHandler.getState().generalError);
		}
	}

	async function handleStreamingResponse(response: Response, formElement?: HTMLFormElement) {
		sseHandler = new SSEHandler({
			onProgress: (progressState) => {
				state.progressState = progressState;
				if (callbacks.onProgress) callbacks.onProgress(progressState);
			},
			onComplete: () => {
				formElement?.reset();
				state.isLoading = false;
				invalidateAll();
				if (callbacks.onSuccess) callbacks.onSuccess();
			},
			onError: (progressState, error) => {
				state.progressState = progressState;
				errorHandler.setGeneralError(error);
				state.errorState = errorHandler.getState();
				state.isLoading = false;
				if (callbacks.onError) callbacks.onError(error);
			}
		});

		await sseHandler.handleStreamResponse(response);
	}

	async function handleNonStreamingResponse(response: Response) {
		const wasError = await errorHandler.handleFetchError(response);
		if (wasError) {
			state.errorState = errorHandler.getState();
			if (callbacks.onError) callbacks.onError(errorHandler.getState().generalError);
		}
		state.isLoading = false;
	}

	return {
		get state() { return state; },
		submitForm,
		resetState
	};
}