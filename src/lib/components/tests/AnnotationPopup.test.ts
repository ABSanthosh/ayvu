import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import AnnotationPopup from '../AnnotationPopup.svelte';

test('renders and handles user input', async () => {
	const onSave = vi.fn();
	const onCancel = vi.fn();

	const { component } = render(AnnotationPopup, {
		paperId: 'paper-1',
		onSave,
		onCancel
	});

	// Mock the Selection and DOMRect
	const mockSelection = {
		toString: () => 'selected text',
		getRangeAt: () => ({
			commonAncestorContainer: {
				textContent: 'This is the full text containing the selected text.'
			},
			startOffset: 35,
			endOffset: 48
		})
	} as unknown as Selection;

	const mockRect = {
		left: 100,
		top: 100,
		width: 200,
		height: 20
	} as DOMRect;

	// Show the popup
	await component.show(mockSelection, mockRect);

	expect(screen.getByText('Add Annotation')).toBeInTheDocument();
	const noteTextarea = screen.getByPlaceholderText('Add your note here... (optional)');
	expect(noteTextarea).toBeInTheDocument();

	// Type a note
	const testNote = 'This is a test note.';
	await fireEvent.input(noteTextarea, { target: { value: testNote } });

	// Change color
	const blueColorButton = screen.getByLabelText('Blue');
	await fireEvent.click(blueColorButton);

	// Save the note
	const saveButton = screen.getByText('Save Note');
	await fireEvent.click(saveButton);

	expect(onSave).toHaveBeenCalledWith({
		selectedText: 'selected text',
		note: testNote,
		highlightColor: '#2196f3', // Blue
		startOffset: 35,
		endOffset: 48,
		anchorText: 'full text containing the selected text.'
	});
});

test('handles highlight only', async () => {
	const onSave = vi.fn();
	const onCancel = vi.fn();

	const { component } = render(AnnotationPopup, {
		paperId: 'paper-1',
		onSave,
		onCancel
	});

	const mockSelection = {
		toString: () => 'highlight this',
		getRangeAt: () => ({
			commonAncestorContainer: {
				textContent: 'Some text to highlight this part.'
			},
			startOffset: 13,
			endOffset: 27
		})
	} as unknown as Selection;
	const mockRect = { left: 50, top: 50, width: 100, height: 15 } as DOMRect;

	await component.show(mockSelection, mockRect);

	const highlightOnlyButton = screen.getByText('Highlight Only');
	await fireEvent.click(highlightOnlyButton);

	expect(onSave).toHaveBeenCalledWith({
		selectedText: 'highlight this',
		note: '',
		highlightColor: '#ffeb3b', // Default yellow
		startOffset: 13,
		endOffset: 27,
		anchorText: 'Some text to highlight this part.'
	});
});

test('calls onCancel when cancel button is clicked', async () => {
	const onSave = vi.fn();
	const onCancel = vi.fn();

	const { component } = render(AnnotationPopup, {
		paperId: 'paper-1',
		onSave,
		onCancel
	});

	const mockSelection = {
		toString: () => 'text',
		getRangeAt: () => ({
			commonAncestorContainer: { textContent: 'some text' },
			startOffset: 5,
			endOffset: 9
		})
	} as unknown as Selection;
	const mockRect = { left: 10, top: 10, width: 30, height: 15 } as DOMRect;

	await component.show(mockSelection, mockRect);

	const cancelButton = screen.getByLabelText('Cancel');
	await fireEvent.click(cancelButton);

	expect(onCancel).toHaveBeenCalled();
});
