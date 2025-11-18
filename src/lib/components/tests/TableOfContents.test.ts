import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { expect, test, describe, beforeEach, vi } from 'vitest';
import { setContext } from 'svelte';
import TableOfContents from '../TableOfContents.svelte';
import type { TocEntry } from '$lib/types/Toc.type';

// Helper component wrapper to provide context
import { SvelteComponent } from 'svelte';

describe('TableOfContents Component', () => {
	const mockToc: TocEntry[] = [
		{
			id: 'section-1',
			title: 'Introduction',
			level: 'section',
			tag: '1',
			children: [
				{
					id: 'subsection-1-1',
					title: 'Background',
					level: 'subsection',
					tag: '1.1',
					children: []
				},
				{
					id: 'subsection-1-2',
					title: 'Motivation',
					level: 'subsection',
					tag: '1.2',
					children: [
						{
							id: 'subsubsection-1-2-1',
							title: 'Research Gap',
							level: 'subsubsection',
							tag: '1.2.1',
							children: []
						}
					]
				}
			]
		},
		{
			id: 'section-2',
			title: 'Methodology',
			level: 'section',
			tag: '2',
			children: []
		}
	];

	let mockIsOpen = { default: true };

	beforeEach(() => {
		// Reset DOM
		document.body.innerHTML = '';
		mockIsOpen = { default: true };
		
		// Mock IntersectionObserver
		global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
			observe: vi.fn(),
			disconnect: vi.fn(),
			unobserve: vi.fn(),
			takeRecords: vi.fn(),
			root: null,
			rootMargin: '',
			thresholds: []
		}));

		// Mock scrollIntoView
		Element.prototype.scrollIntoView = vi.fn();

		// Mock HTMLDialogElement methods (jsdom doesn't fully implement them)
		if (typeof HTMLDialogElement !== 'undefined') {
			HTMLDialogElement.prototype.showModal = vi.fn(function(this: HTMLDialogElement) {
				this.open = true;
			});
			HTMLDialogElement.prototype.close = vi.fn(function(this: HTMLDialogElement) {
				this.open = false;
			});
		}
	});

	test('renders table of contents with proper structure', () => {
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		// Check if the TOC header is rendered
		expect(screen.getByText('Contents')).toBeInTheDocument();
		
		// Check if sections are rendered
		expect(screen.getByText('Introduction')).toBeInTheDocument();
		expect(screen.getByText('Methodology')).toBeInTheDocument();
		
		// Check if subsections are rendered
		expect(screen.getByText('Background')).toBeInTheDocument();
		expect(screen.getByText('Motivation')).toBeInTheDocument();
		
		// Check if subsubsections are rendered
		expect(screen.getByText('Research Gap')).toBeInTheDocument();
	});

	test('renders section tags correctly', () => {
		render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		// Check for section tags
		expect(screen.getByText('1')).toBeInTheDocument();
		expect(screen.getByText('1.1')).toBeInTheDocument();
		expect(screen.getByText('1.2')).toBeInTheDocument();
		expect(screen.getByText('1.2.1')).toBeInTheDocument();
		expect(screen.getByText('2')).toBeInTheDocument();
	});

	test('renders with empty TOC array', () => {
		const { container } = render(TableOfContents, {
			props: { toc: [] },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		// Should not render anything when toc is empty
		expect(container.querySelector('.toc')).not.toBeInTheDocument();
	});

	test('applies correct CSS classes based on hierarchy', () => {
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		// Check for section level classes
		const sectionItems = container.querySelectorAll('.toc__item--section');
		expect(sectionItems.length).toBeGreaterThan(0);

		// Check for subsection level classes
		const subsectionItems = container.querySelectorAll('.toc__item--subsection');
		expect(subsectionItems.length).toBeGreaterThan(0);

		// Check for subsubsection level classes
		const subsubsectionItems = container.querySelectorAll('.toc__item--subsubsection');
		expect(subsubsectionItems.length).toBeGreaterThan(0);
	});

	test('handles click on TOC link', async () => {
		const user = userEvent.setup();
		
		// Create mock element
		const mockElement = document.createElement('div');
		mockElement.id = 'section-1';
		mockElement.scrollIntoView = vi.fn();
		document.body.appendChild(mockElement);

		render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const link = screen.getByText('Introduction').closest('a');
		expect(link).toBeInTheDocument();

		// Click the link
		await user.click(link!);

		// Verify scrollIntoView was called
		expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'start'
		});
	});

	test('handles click on nested subsection link', async () => {
		const user = userEvent.setup();
		
		// Create mock element
		const mockElement = document.createElement('div');
		mockElement.id = 'subsection-1-1';
		mockElement.scrollIntoView = vi.fn();
		document.body.appendChild(mockElement);

		render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const link = screen.getByText('Background').closest('a');
		expect(link).toBeInTheDocument();

		// Click the link
		await user.click(link!);

		// Verify scrollIntoView was called
		expect(mockElement.scrollIntoView).toHaveBeenCalledWith({
			behavior: 'smooth',
			block: 'start'
		});
	});

	test('applies isOpen class when sidebar is open', () => {
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const tocElement = container.querySelector('.toc');
		expect(tocElement).toHaveClass('isOpen');
	});

	test('does not apply isOpen class when sidebar is closed', () => {
		mockIsOpen.default = false;
		
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const tocElement = container.querySelector('.toc');
		expect(tocElement).not.toHaveClass('isOpen');
	});

	test('renders nested structure correctly', () => {
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		// Check for nested lists
		const sublists = container.querySelectorAll('.toc__sublist');
		expect(sublists.length).toBeGreaterThan(0);

		// Verify proper nesting
		const mainList = container.querySelector('.toc__list');
		expect(mainList).toBeInTheDocument();
	});

	test('handles TOC with single section', () => {
		const singleSectionToc: TocEntry[] = [
			{
				id: 'section-1',
				title: 'Single Section',
				level: 'section',
				tag: '1',
				children: []
			}
		];

		render(TableOfContents, {
			props: { toc: singleSectionToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		expect(screen.getByText('Single Section')).toBeInTheDocument();
		expect(screen.getByText('1')).toBeInTheDocument();
	});

	test('handles deeply nested structure', () => {
		const deeplyNestedToc: TocEntry[] = [
			{
				id: 'section-1',
				title: 'Section',
				level: 'section',
				tag: '1',
				children: [
					{
						id: 'subsection-1-1',
						title: 'Subsection',
						level: 'subsection',
						tag: '1.1',
						children: [
							{
								id: 'subsubsection-1-1-1',
								title: 'Subsubsection',
								level: 'subsubsection',
								tag: '1.1.1',
								children: []
							}
						]
					}
				]
			}
		];

		render(TableOfContents, {
			props: { toc: deeplyNestedToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		expect(screen.getByText('Section')).toBeInTheDocument();
		expect(screen.getByText('Subsection')).toBeInTheDocument();
		expect(screen.getByText('Subsubsection')).toBeInTheDocument();
	});

	test('all links have proper href attributes', () => {
		const { container } = render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const links = container.querySelectorAll('.toc__link');
		links.forEach((link) => {
			const href = link.getAttribute('href');
			expect(href).toMatch(/^#/); // Should start with #
		});
	});

	test('handles click on element that does not exist in DOM', async () => {
		const user = userEvent.setup();

		render(TableOfContents, {
			props: { toc: mockToc },
			context: new Map([['isSidebarOpen', mockIsOpen]])
		});

		const link = screen.getByText('Introduction').closest('a');
		
		// Don't create the element in DOM
		// Click should not throw error
		await expect(user.click(link!)).resolves.not.toThrow();
	});
});
