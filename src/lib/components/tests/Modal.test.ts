import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import ModalTestHost from './ModalTestHost.svelte';
import { tick } from 'svelte';

test('renders when showModal is true', async () => {
	render(ModalTestHost, { showModal: true });

	await tick(); // Wait for effect to run

	const dialog = screen.getByRole('dialog');
	expect(dialog).toBeInTheDocument();
	expect(dialog).toHaveAttribute('open');
	expect(screen.getByText('Test Modal')).toBeInTheDocument();
	expect(screen.getByText('Modal Content')).toBeInTheDocument();
});

test('does not render when showModal is false', () => {
	render(ModalTestHost, { showModal: false });
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('closes when the close button is clicked', async () => {
	const { component } = render(ModalTestHost, { showModal: true });

	await tick();

	const dialog = screen.getByRole('dialog') as HTMLDialogElement;
	expect(dialog.open).toBe(true);

	const closeButton = screen.getByText('[x]');
	await fireEvent.click(closeButton);

	await tick();

	// After clicking close, the dialog's `onclose` should trigger the binding to update.
	// The host component will receive the update and re-render.
	// We expect the dialog to be gone from the DOM.
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('closes when the backdrop is clicked', async () => {
	const { component } = render(ModalTestHost, { showModal: true });

	await tick();

	const dialog = screen.getByRole('dialog') as HTMLDialogElement;
	expect(dialog.open).toBe(true);

	// fireEvent.click(dialog) simulates clicking on the backdrop
	await fireEvent.click(dialog);

	await tick();

	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
