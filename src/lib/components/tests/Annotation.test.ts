import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import Annotation from '../Annotation.svelte';
import type { AnnotationData } from '$lib/db/Annotation.db';

const mockAnnotation: AnnotationData = {
	id: '1',
	paperId: 'paper-1',
	userId: 'user-1',
	selectedText: 'This is a test annotation.',
	anchorText: 'This is a test annotation.',
	note: 'A test note.',
	highlightColor: '#ffcc00',
	startOffset: 0,
	endOffset: 28,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString()
};

test('renders annotation and toggles card visibility', async () => {
	const onUpdate = vi.fn();
	const onDelete = vi.fn();

	render(Annotation, {
		annotation: mockAnnotation,
		onUpdate,
		onDelete
	});

	const toggleButton = screen.getByLabelText('Toggle annotation');
	expect(toggleButton).toBeInTheDocument();

	// Card should be hidden initially
	expect(screen.queryByText('Selected text:')).not.toBeInTheDocument();

	// Click to show card
	await fireEvent.click(toggleButton);
	expect(screen.getByText('Selected text:')).toBeInTheDocument();
	expect(screen.getByText(`"${mockAnnotation.selectedText}"`)).toBeInTheDocument();
	expect(screen.getByText('Your note:')).toBeInTheDocument();
	expect(screen.getByText(mockAnnotation.note!)).toBeInTheDocument();

	// Click to hide card
	await fireEvent.click(toggleButton);
	expect(screen.queryByText('Selected text:')).not.toBeInTheDocument();
});

test('enters edit mode, saves, and cancels', async () => {
	const onUpdate = vi.fn();
	const onDelete = vi.fn();

	render(Annotation, {
		annotation: mockAnnotation,
		onUpdate,
		onDelete
	});

	const toggleButton = screen.getByLabelText('Toggle annotation');
	await fireEvent.click(toggleButton);

	// Enter edit mode
	const editButton = screen.getByLabelText('Edit');
	await fireEvent.click(editButton);

	const textarea = screen.getByPlaceholderText('Your note...');
	expect(textarea).toBeInTheDocument();
	expect(textarea).toHaveValue(mockAnnotation.note);

	// Change note and save
	const newNote = 'This is an updated note.';
	await fireEvent.input(textarea, { target: { value: newNote } });
	const saveButton = screen.getByText('Save');
	await fireEvent.click(saveButton);

	expect(onUpdate).toHaveBeenCalledWith(mockAnnotation.id, newNote);
	// Exits edit mode
	expect(screen.queryByText('Save')).not.toBeInTheDocument();

	// Re-enter edit mode
	await fireEvent.click(screen.getByLabelText('Edit'));

	// Cancel edit
	await fireEvent.input(screen.getByPlaceholderText('Your note...'), {
		target: { value: 'some other change' }
	});
	const cancelButton = screen.getByText('Cancel');
	await fireEvent.click(cancelButton);

	// Exits edit mode and note is reverted
	expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
	expect(screen.getByText(mockAnnotation.note!)).toBeInTheDocument(); // Assuming the component state reverts
});

test('calls onDelete when delete button is clicked', async () => {
	const onUpdate = vi.fn();
	const onDelete = vi.fn();

	render(Annotation, {
		annotation: mockAnnotation,
		onUpdate,
		onDelete
	});

	const toggleButton = screen.getByLabelText('Toggle annotation');
	await fireEvent.click(toggleButton);

	const deleteButton = screen.getByLabelText('Delete');
	await fireEvent.click(deleteButton);

	expect(onDelete).toHaveBeenCalledWith(mockAnnotation.id);
});
