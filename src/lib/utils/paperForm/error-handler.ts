import { type ActionResult } from '@sveltejs/kit';
import { deserialize } from '$app/forms';
import { addToast } from '$stores/ToastStore';

export interface FormError {
	[key: string]: string;
}

export interface ErrorState {
	formErrors: FormError;
	generalError: string;
}

export interface ErrorHandlerOptions {
	showToasts?: boolean;
	toastType?: 'info' | 'success' | 'warning' | 'danger' | 'default';
}

export class ErrorHandler {
	private state: ErrorState = {
		formErrors: {},
		generalError: ''
	};

	private options: ErrorHandlerOptions;

	constructor(options: ErrorHandlerOptions = {}) {
		this.options = {
			showToasts: true,
			toastType: 'danger',
			...options
		};
	}

	getState(): ErrorState {
		return { ...this.state };
	}

	reset(): void {
		this.state = {
			formErrors: {},
			generalError: ''
		};
	}

	setGeneralError(message: string): void {
		this.state.generalError = message;

		// Show toast if enabled
		if (this.options.showToasts && message) {
			addToast({
				message,
				type: this.options.toastType
			});
		}
	}

	setFormError(field: string, message: string): void {
		this.state.formErrors = {
			...this.state.formErrors,
			[field]: message
		};
	}

	clearFormError(field: string): void {
		const { [field]: removed, ...rest } = this.state.formErrors;
		this.state.formErrors = rest;
	}

	hasErrors(): boolean {
		return this.state.generalError !== '' || Object.keys(this.state.formErrors).length > 0;
	}

	handleActionResult(result: ActionResult): void {
		this.reset();

		switch (result.type) {
			case 'failure':
				if (result.data?.error) {
					// Handle field-specific errors
					Object.entries(result.data.error).forEach(([field, message]) => {
						this.setFormError(field, message as string);
					});
				}
				// Also check for general message in failure responses
				if (result.data?.message) {
					this.setGeneralError(result.data.message as string);
				}
				break;
			case 'error':
				// SvelteKit error responses have the message in error.body.message
				const errorMessage =
					result.error?.body?.message || result.error?.message || 'An error occurred';
				this.setGeneralError(errorMessage);
				break;
		}
	}

	async handleFetchError(response: Response): Promise<boolean> {
		this.reset();

		if (!response.ok) {
			try {
				// First try to get the response text
				const responseText = await response.text();
				console.log('Error response text:', responseText);

				// For SvelteKit error() responses, try parsing as JSON first
				try {
					const jsonResponse = JSON.parse(responseText);
					console.log('Parsed JSON response:', jsonResponse);
					if (jsonResponse.message) {
						this.setGeneralError(jsonResponse.message);
						return true;
					}
				} catch (jsonErr) {
					console.log('JSON parsing failed, trying ActionResult deserialization');
					// If JSON parsing fails, try to parse as SvelteKit ActionResult
					try {
						const result: ActionResult = deserialize(responseText);
						this.handleActionResult(result);
						return true;
					} catch (deserializeErr) {
						console.log('ActionResult deserialization failed, using raw text');
						// If all parsing fails, use the response text as error message
						const errorMessage =
							responseText || `Server error: ${response.status} ${response.statusText}`;
						this.setGeneralError(errorMessage);
						return true;
					}
				}
			} catch (err) {
				console.error('Error handling fetch error:', err);
				this.setGeneralError(`Server error: ${response.status} ${response.statusText}`);
				return true;
			}
		}

		return false; // No error to handle
	}

	handleGenericError(error: unknown, defaultMessage = 'An unexpected error occurred'): void {
		this.reset();

		if (error instanceof Error) {
			this.setGeneralError(error.message);
		} else if (typeof error === 'string') {
			this.setGeneralError(error);
		} else {
			this.setGeneralError(defaultMessage);
		}
	}
}

// Utility functions for common error scenarios
export function createErrorHandler(options: ErrorHandlerOptions = {}): ErrorHandler {
	return new ErrorHandler(options);
}

export function isStreamResponse(response: Response): boolean {
	const contentType = response.headers.get('content-type');
	return contentType?.includes('text/event-stream') ?? false;
}

export function extractErrorMessage(error: unknown, fallback = 'An error occurred'): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return fallback;
}
