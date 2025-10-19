import { type SSEState } from './sse-handler';
import { type ErrorState } from './error-handler';

export interface FormState {
	isLoading: boolean;
	isSubmitted: boolean;
	errors: ErrorState;
	progress: SSEState;
}

export class FormStateManager {
	private state: FormState = {
		isLoading: false,
		isSubmitted: false,
		errors: {
			formErrors: {},
			generalError: ''
		},
		progress: {
			progressSteps: {},
			overallStatus: 'pending' as any,
			errorMessage: '',
			isLoading: false
		}
	};

	private listeners: Array<(state: FormState) => void> = [];

	getState(): FormState {
		return { ...this.state };
	}

	subscribe(listener: (state: FormState) => void): () => void {
		this.listeners.push(listener);
		// Return unsubscribe function
		return () => {
			const index = this.listeners.indexOf(listener);
			if (index > -1) {
				this.listeners.splice(index, 1);
			}
		};
	}

	private notify(): void {
		this.listeners.forEach(listener => listener(this.getState()));
	}

	private updateState(updates: Partial<FormState>): void {
		this.state = { ...this.state, ...updates };
		this.notify();
	}

	setLoading(isLoading: boolean): void {
		this.updateState({ isLoading });
	}

	setSubmitted(isSubmitted: boolean): void {
		this.updateState({ isSubmitted });
	}

	setErrors(errors: ErrorState): void {
		this.updateState({ errors });
	}

	setProgress(progress: SSEState): void {
		this.updateState({ progress });
	}

	reset(): void {
		this.state = {
			isLoading: false,
			isSubmitted: false,
			errors: {
				formErrors: {},
				generalError: ''
			},
			progress: {
				progressSteps: {},
				overallStatus: 'pending' as any,
				errorMessage: '',
				isLoading: false
			}
		};
		this.notify();
	}

	startSubmission(): void {
		this.updateState({
			isLoading: true,
			isSubmitted: false,
			errors: {
				formErrors: {},
				generalError: ''
			}
		});
	}

	completeSubmission(success: boolean = true): void {
		this.updateState({
			isLoading: false,
			isSubmitted: success
		});
	}
}

export function createFormStateManager(): FormStateManager {
	return new FormStateManager();
}