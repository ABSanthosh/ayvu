import {
	ProcessingStatus,
	ProcessingStep,
	type ProgressEvent,
	type StepProgress
} from '$types/SSE.type';
import { addToast } from '$stores/ToastStore';

export interface SSEState {
	progressSteps: Partial<Record<ProcessingStep, StepProgress>>;
	overallStatus: ProcessingStatus;
	errorMessage: string;
	isLoading: boolean;
}

export interface SSECallbacks {
	onProgress?: (state: SSEState) => void;
	onComplete?: (state: SSEState) => void;
	onError?: (state: SSEState, error: string) => void;
}

export interface SSEHandlerOptions {
	showToasts?: boolean;
}

export class SSEHandler {
	private state: SSEState = {
		progressSteps: {},
		overallStatus: ProcessingStatus.PENDING,
		errorMessage: '',
		isLoading: false
	};

	private options: SSEHandlerOptions;

	constructor(
		private callbacks: SSECallbacks = {},
		options: SSEHandlerOptions = {}
	) {
		this.options = {
			showToasts: true,
			...options
		};
	}

	getState(): SSEState {
		return { ...this.state };
	}

	private updateState(updates: Partial<SSEState>) {
		this.state = { ...this.state, ...updates };
	}

	private notifyProgress() {
		this.callbacks.onProgress?.(this.getState());
	}

	async handleStreamResponse(response: Response): Promise<SSEState> {
		if (!response.body) {
			const error = 'No response body received';
			this.updateState({ errorMessage: error, isLoading: false });
			
			// Show toast for connection errors
			if (this.options.showToasts) {
				addToast({
					message: error,
					type: 'danger',
					timeout: 6000
				});
			}
			
			this.callbacks.onError?.(this.getState(), error);
			return this.getState();
		}

		this.updateState({ isLoading: true, errorMessage: '' });
		this.notifyProgress();

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					await this.processSSELine(line);
				}
			}
		} catch (err) {
			const error = 'Connection to server lost';
			console.error('Stream reading error:', err);
			this.updateState({ errorMessage: error, isLoading: false });
			
			// Show toast for connection errors
			if (this.options.showToasts) {
				addToast({
					message: error,
					type: 'danger',
					timeout: 6000
				});
			}
			
			this.callbacks.onError?.(this.getState(), error);
		}

		return this.getState();
	}

	private async processSSELine(line: string): Promise<void> {
		if (!line.startsWith('data: ')) return;

		try {
			const event: ProgressEvent = JSON.parse(line.slice(6));

			switch (event.type) {
				case 'progress':
					this.handleProgressEvent(event);
					break;
				case 'complete':
					this.handleCompleteEvent();
					break;
				case 'error':
					this.handleErrorEvent(event);
					break;
			}
		} catch (err) {
			console.error('Failed to parse SSE data:', err);
		}
	}

	private handleProgressEvent(event: ProgressEvent): void {
		const updates: Partial<SSEState> = {};

		// Update specific step progress
		if (event.data.step && event.data.progress) {
			updates.progressSteps = {
				...this.state.progressSteps,
				[event.data.step]: event.data.progress
			};
		}

		// Update all steps if provided
		if (event.data.steps) {
			updates.progressSteps = { ...this.state.progressSteps, ...event.data.steps };
		}

		// Update overall status
		if (event.data.overallStatus) {
			updates.overallStatus = event.data.overallStatus;
		}

		this.updateState(updates);
		this.notifyProgress();
	}

	private handleCompleteEvent(): void {
		this.updateState({
			overallStatus: ProcessingStatus.COMPLETED,
			isLoading: false
		});
		
		// Show success toast
		if (this.options.showToasts) {
			addToast({
				message: 'Paper successfully added to your collection!',
				type: 'success',
				timeout: 5000
			});
		}
		
		this.callbacks.onComplete?.(this.getState());
	}

	private handleErrorEvent(event: ProgressEvent): void {
		const error = event.data.progress?.error || 'Processing failed';
		this.updateState({
			errorMessage: error,
			overallStatus: ProcessingStatus.FAILED,
			isLoading: false
		});
		
		// Show toast notification for processing errors
		if (this.options.showToasts) {
			addToast({
				message: error,
				type: 'danger',
				timeout: 6000
			});
		}
		
		this.callbacks.onError?.(this.getState(), error);
	}

	reset(): void {
		this.state = {
			progressSteps: {},
			overallStatus: ProcessingStatus.PENDING,
			errorMessage: '',
			isLoading: false
		};
	}
}

// Utility function to create and use SSE handler
export async function handleSSEResponse(
	response: Response,
	callbacks: SSECallbacks = {},
	options: SSEHandlerOptions = {}
): Promise<SSEState> {
	const handler = new SSEHandler(callbacks, options);
	return await handler.handleStreamResponse(response);
}