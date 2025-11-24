# Frontend Testing Strategy

This document outlines the structure, conventions, and technical details for writing frontend tests in this project. The primary goal is to ensure component reliability, maintainability, and to catch regressions before they reach production.

## Core Technologies

Our testing ecosystem is built upon a modern stack that integrates seamlessly with Svelte and Vite.

-   **[Vitest](https://vitest.dev/)**: A Vite-native testing framework. It serves as our test runner, assertion library, and provides powerful mocking capabilities. We use its `describe`, `test`, and `expect` APIs, along with its `vi` utility for mocking.
-   **[Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro)**: A library for testing Svelte components in a user-centric way. It provides utilities to render components into a simulated DOM and interact with them as a user would. Key functions include `render`, `screen`, and `fireEvent`.
-   **[JSDOM](https://github.com/jsdom/jsdom)**: Vitest uses JSDOM to create a simulated browser environment within Node.js. This allows us to run DOM-related tests without needing to launch an actual browser, making tests faster and more portable.

## Test File Structure

All test files are co-located with the component they are testing, inside a `tests` subdirectory, and follow the `ComponentName.test.ts` naming convention.

A typical test file has the following structure:

```typescript
// 1. Imports from testing libraries and the component under test
import { render, screen, waitFor, act } from '@testing-library/svelte';
import { expect, test, vi, beforeEach, describe } from 'vitest';
import MyComponent from '../MyComponent.svelte';
import { writable } from 'svelte/store';

// 2. Mocking external dependencies and modules
vi.mock('$app/forms', () => ({
    enhance: vi.fn(),
}));

vi.mock('$lib/services/api', () => ({
    fetchData: vi.fn().mockResolvedValue({ success: true }),
}));

// 3. The main test suite for the component
describe('MyComponent.svelte', () => {

    // 4. Setup and teardown logic that runs before each test
    beforeEach(() => {
        // Reset all mocks to ensure test isolation
        vi.clearAllMocks();

        // Mock global objects like fetch if needed
        global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
    });

    // 5. Individual test cases
    test('should render and initialize correctly', async () => {
        // Arrange: Set up props, context, and render the component
        render(MyComponent, { prop1: 'value' });

        // Act: Simulate user interactions or async events
        // (e.g., await fireEvent.click(screen.getByRole('button')))

        // Assert: Check if the outcome is as expected
        await waitFor(() => {
            expect(screen.getByText('Success!')).toBeInTheDocument();
        });
    });
});
```

## Mocking Dependencies

Mocking is a critical technique used to isolate the component under test from its dependencies (e.g., SvelteKit modules, API services, Web Workers, Svelte's context). This makes tests deterministic, faster, and prevents them from performing real network requests or database operations.

We use Vitest's `vi.mock()` function for this purpose.

### Technical Details from `AIChat.test.ts`

The test for `AIChat.svelte` provides excellent examples of advanced mocking strategies:

1.  **SvelteKit Modules**: Modules like `$app/forms` are mocked to prevent the `enhance` action from executing its actual logic.

    ```typescript
    vi.mock('$app/forms', () => ({
        enhance: vi.fn().mockImplementation(() => {})
    }));
    ```

2.  **Internal Modules (`$lib/`)**: Internal services like the `VectorIDB` are mocked to control their behavior and prevent actual IndexedDB operations.

    ```typescript
    const mockVectorDB = {
        isEmpty: vi.fn().mockResolvedValue(true),
        insert: vi.fn().mockResolvedValue(undefined)
    };
    vi.mock('$lib/RAG/vdb', () => {
        return {
            default: vi.fn().mockImplementation(() => mockVectorDB)
        };
    });
    ```

3.  **Web Workers**: Mocking Web Workers requires a special approach because the component interacts with them via `postMessage` and an `onmessage` event handler. The mock creates a controllable interface for the worker.

    ```typescript
    // A callback function to hold the component's onmessage handler
    let onmessageCallback: ((e: MessageEvent) => void) | null = null;

    const mockEmbedWorker = {
        postMessage: vi.fn(),
        // The component will assign its handler to this setter
        set onmessage(callback: ((e: MessageEvent) => void) | null) {
            onmessageCallback = callback;
        },
        get onmessage(): ((e: MessageEvent) => void) | null {
            return onmessageCallback;
        },
        terminate: vi.fn()
    };

    vi.mock('$lib/RAG/embedWorker?worker', () => ({
        default: vi.fn().mockImplementation(() => mockEmbedWorker)
    }));
    ```

    This allows the test to simulate a message from the worker by directly invoking `onmessageCallback`.

4.  **Svelte's Context API**: To provide context to a component, the `svelte` module itself is mocked. This allows us to inject mock context values and stores that the component will consume via `getContext`.

    ```typescript
    vi.mock('svelte', async () => {
        const originalSvelte = await vi.importActual('svelte');
        const mockContext = new Map();
        return {
            ...originalSvelte,
            getContext: vi.fn((key) => mockContext.get(key)),
            setContext: vi.fn((key, value) => mockContext.set(key, value)),
        };
    });
    ```

## Asynchronous Testing

Modern components are often asynchronous. The `AIChat` component, for example, performs several async initialization steps. Svelte Testing Library provides utilities to handle this gracefully.

-   **`async`/`await`**: Test functions are marked `async` to allow the use of `await`.
-   **`waitFor`**: This utility waits for the UI to update in response to an asynchronous action. It repeatedly checks for a condition until it passes or a timeout is reached. It is essential for asserting that text or elements appear after a delay.
-   **`act`**: This function ensures that any state updates that cause UI changes are wrapped, making the test behave more closely to how Svelte works in the browser. In `AIChat.test.ts`, it's used to wrap the simulated worker message, which triggers state changes in the component.

### Example from `AIChat.test.ts`

This snippet demonstrates how these concepts work together to test the component's initialization flow.

```typescript
test('renders initial state correctly and initializes', async () => {
    // ... (Arrange) render component

    // Assert initial state
    expect(screen.getByText('Initializing...')).toBeInTheDocument();

    // Assert async UI updates
    await waitFor(() => {
        expect(screen.getByText('Initializing VectorDB...')).toBeInTheDocument();
    });

    // ... more waitFor assertions for each step

    // Act: Simulate an async event (worker message)
    act(() => {
        if (onmessageCallback) {
            onmessageCallback({
                data: { command: 'initFinished', payload: { requestID: '1234.5678' } }
            } as MessageEvent);
        }
    });

    // Assert the final state after the event
    await waitFor(() => {
        expect(screen.getByText('Build with agent mode.')).toBeInTheDocument();
    });
});
```
