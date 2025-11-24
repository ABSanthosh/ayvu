import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import PaperCard from '../PaperCard.svelte';

const mockPaper = {
	id: '1234.5678',
	title: 'A Test Paper Title That Is Quite Long to Check Clamping',
	authors: ['Author One', 'Author Two', 'Author Three', 'Author Four'],
	published: '2023-10-27',
	abstract:
		'This is a test abstract for the paper card component. It is designed to be long enough to test the line clamping functionality and see if it truncates the text as expected. We need a few more sentences to make sure it really works across different screen sizes and layouts.',
	preview: 'path/to/preview.png'
};

test('renders in "Desc" mode', () => {
	render(PaperCard, {
		...mockPaper,
		type: 'Desc'
	});

	expect(screen.getByAltText('Preview')).toBeInTheDocument();
	expect(screen.getByText(mockPaper.title)).toBeInTheDocument();
	expect(screen.getByText(/Author One, Author Two, 2\+/)).toBeInTheDocument();
	expect(screen.getByText(mockPaper.abstract)).toBeInTheDocument();
});

test('renders in "No-Preview" mode', () => {
	render(PaperCard, {
		...mockPaper,
		type: 'No-Preview'
	});

	expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
	expect(screen.getByText(mockPaper.title)).toBeInTheDocument();
	expect(screen.getByText(/Author One, Author Two, 2\+/)).toBeInTheDocument();
	expect(screen.getByText(mockPaper.abstract)).toBeInTheDocument();
});

test('renders in "Table" mode', () => {
	render(PaperCard, {
		...mockPaper,
		type: 'Table'
	});

	expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
	expect(screen.getByText(mockPaper.title)).toBeInTheDocument();
	expect(screen.getByText(/Author One, Author Two, 2\+/)).toBeInTheDocument();
	expect(screen.queryByText(mockPaper.abstract)).not.toBeInTheDocument();
});

test('formats authors correctly with 2 authors', () => {
	render(PaperCard, {
		...mockPaper,
		authors: ['Author One', 'Author Two'],
		type: 'Desc'
	});

	expect(screen.getByText(/Author One, Author Two/)).toBeInTheDocument();
	expect(screen.queryByText(/, \d+\+/)).not.toBeInTheDocument();
});

test('formats authors correctly with 1 author', () => {
	render(PaperCard, {
		...mockPaper,
		authors: ['Author One'],
		type: 'Desc'
	});

	expect(screen.getByText(/Author One/)).toBeInTheDocument();
	expect(screen.queryByText(/, /)).not.toBeInTheDocument();
});
