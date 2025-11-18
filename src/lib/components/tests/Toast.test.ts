import { render, screen } from '@testing-library/svelte';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import Toast from './Toast.svelte';
import type { IToast } from '$stores/ToastStore';

describe('Toast Component', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders with default type and message', () => {
		const props: IToast = {
			message: 'Test message',
			id: 'test-1'
		};

		render(Toast, { props });

		const toast = screen.getByText('Test message');
		expect(toast).toBeInTheDocument();
		expect(toast).toHaveClass('Toast');
		expect(toast).toHaveAttribute('data-type', 'default');
	});

	test('renders with info type', () => {
		const props: IToast = {
			message: 'Info message',
			type: 'info',
			id: 'test-2'
		};

		render(Toast, { props });

		const toast = screen.getByText('Info message');
		expect(toast).toBeInTheDocument();
		expect(toast).toHaveAttribute('data-type', 'info');
	});

	test('renders with success type', () => {
		const props: IToast = {
			message: 'Success message',
			type: 'success',
			id: 'test-3'
		};

		render(Toast, { props });

		const toast = screen.getByText('Success message');
		expect(toast).toBeInTheDocument();
		expect(toast).toHaveAttribute('data-type', 'success');
	});

	test('renders with warning type', () => {
		const props: IToast = {
			message: 'Warning message',
			type: 'warning',
			id: 'test-4'
		};

		render(Toast, { props });

		const toast = screen.getByText('Warning message');
		expect(toast).toBeInTheDocument();
		expect(toast).toHaveAttribute('data-type', 'warning');
	});

	test('renders with danger type', () => {
		const props: IToast = {
			message: 'Danger message',
			type: 'danger',
			id: 'test-5'
		};

		render(Toast, { props });

		const toast = screen.getByText('Danger message');
		expect(toast).toBeInTheDocument();
		expect(toast).toHaveAttribute('data-type', 'danger');
	});

	test('applies correct ID attribute', () => {
		const props: IToast = {
			message: 'Test message',
			id: 'custom-toast-id'
		};

		render(Toast, { props });

		const toast = screen.getByText('Test message');
		expect(toast).toHaveAttribute('id', 'custom-toast-id');
	});

	test('renders with long message', () => {
		const longMessage = 'This is a very long message that should still render correctly in the toast component without breaking the layout';
		const props: IToast = {
			message: longMessage,
			id: 'test-6'
		};

		render(Toast, { props });

		const toast = screen.getByText(longMessage);
		expect(toast).toBeInTheDocument();
	});

	test('renders with special characters in message', () => {
		const props: IToast = {
			message: 'Error: <script>alert("test")</script>',
			id: 'test-7',
			type: 'danger'
		};

		render(Toast, { props });

		const toast = screen.getByText('Error: <script>alert("test")</script>');
		expect(toast).toBeInTheDocument();
	});

	test('applies default type when type is undefined', () => {
		const props: IToast = {
			message: 'Message with undefined type',
			id: 'test-8',
			type: undefined
		};

		render(Toast, { props });

		const toast = screen.getByText('Message with undefined type');
		expect(toast).toHaveAttribute('data-type', 'default');
	});
});
