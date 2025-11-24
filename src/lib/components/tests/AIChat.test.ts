import { render, screen, waitFor } from '@testing-library/svelte';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import AIChat from '../AIChat.svelte';
import { writable } from 'svelte/store';
import { act } from '@testing-library/svelte';

// Mock dependencies
vi.mock('$app/forms', () => ({
	enhance: vi.fn().mockImplementation(() => {})
}));

const mockVectorDB = {
	isEmpty: vi.fn().mockResolvedValue(true),
	insert: vi.fn().mockResolvedValue(undefined)
};
vi.mock('$lib/RAG/vdb', () => {
	return {
		default: vi.fn().mockImplementation(() => mockVectorDB)
	};
});

// This is a more robust mock that allows us to control the worker's behavior
let onmessageCallback: ((e: MessageEvent) => void) | null = null;
const mockEmbedWorker = {
	postMessage: vi.fn(),
	set onmessage(callback: ((e: MessageEvent) => void) | null) {
		onmessageCallback = callback;
	},
	get onmessage(): ((e: MessageEvent) => void) | null {
		return onmessageCallback;
	},
	terminate: vi.fn()
};
vi.mock('$lib/RAG/embedWorker?worker', () => {
	return {
		default: vi.fn().mockImplementation(() => mockEmbedWorker)
	};
});

const mockChat = {
	messages: writable([]),
	sendMessage: vi.fn()
};
vi.mock('@ai-sdk/svelte', () => ({
	Chat: vi.fn(() => mockChat)
}));

vi.mock('svelte', async () => {
	const originalSvelte = await vi.importActual('svelte');
	const mockContext = new Map();
	return {
		...originalSvelte,
		getContext: vi.fn((key) => mockContext.get(key)),
		setContext: vi.fn((key, value) => mockContext.set(key, value)),
		// Add a way to clear the context for tests
		clearMockContext: () => mockContext.clear()
	};
});

describe('AIChat.svelte', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		// Clear the svelte context mock
		const svelte = await import('svelte');
		(svelte as any).clearMockContext();

		global.fetch = vi.fn(() =>
			Promise.resolve({
				ok: true,
				json: () => Promise.resolve([])
			})
		) as any;

		mockChat.messages.set([]);
		// Reset mocks that hold state
		mockVectorDB.isEmpty.mockClear().mockResolvedValue(true);
		mockEmbedWorker.postMessage.mockClear();
		onmessageCallback = null;
	});

	test('renders initial state correctly and initializes', async () => {
		const { setContext } = await import('svelte');
		const isAIChatOpen = writable({ default: true });
		setContext('isAIChatOpen', isAIChatOpen);

		render(AIChat, {
			arxivId: '1234.5678',
			abstract: 'Test abstract',
			form: null
		});

		expect(screen.getByText('Initializing...')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText('Initializing VectorDB...')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText('Loading embeddings...')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText('Embeddings loaded into VectorDB.')).toBeInTheDocument();
		});

		await waitFor(() => {
			expect(screen.getByText('Initializing embedding worker...')).toBeInTheDocument();
		});

		// Simulate worker initialization by invoking the onmessage callback
		act(() => {
			if (onmessageCallback) {
				onmessageCallback({
					data: { command: 'initFinished', payload: { requestID: '1234.5678' } }
				} as MessageEvent);
			}
		});

		await waitFor(() => {
			expect(screen.getByText('Embedding worker initialized.')).toBeInTheDocument();
		});

		// Final state after initialization
		await waitFor(() => {
			expect(screen.queryByText(/Embedding worker initialized./)).not.toBeInTheDocument();
			expect(screen.getByText('Build with agent mode.')).toBeInTheDocument();
		});
	});
});
