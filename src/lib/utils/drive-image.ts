/**
 * Converts Google Drive file URLs to thumbnail URLs for image display
 * @param url - The URL to process (can be Google Drive file URL or any other URL)
 * @returns The appropriate image URL (thumbnail URL for Google Drive files, original URL otherwise)
 * @example
 * ```typescript
 * // Google Drive file URL
 * getImageSrc('https://drive.google.com/file/d/1abc123def/view')
 * // Returns: 'https://drive.google.com/thumbnail?id=1abc123def&sz=s4000'
 *
 * // Regular URL (unchanged)
 * getImageSrc('https://example.com/image.png')
 * // Returns: 'https://example.com/image.png'
 * ```
 */
export default function getImageSrc(url: string): string {
	// If the image is from Google Drive, return the thumbnail URL
	if (url.includes('https://drive.google.com/file')) {
		const match = url.match(/\/d\/([^/]+)\//);
		const imgId = match ? match[1] : '';
		return `https://drive.google.com/thumbnail?id=${imgId}&sz=s4000`;
	}

	return url;
}

/**
 * Process HTML content to replace image sources with Google Drive URLs
 * @param htmlContent - The HTML content to process
 * @param driveFileMap - Map of filename to Google Drive file ID
 * @returns Processed HTML content with updated image sources
 */
export function processHtmlImages(
	htmlContent: string,
	driveFileMap: Record<
		string,
		{
			id: string;
			thumbnailLink?: string;
		}
	>
): string {
	// Replace image src attributes
	return htmlContent.replace(
		/<img([^>]*)\ssrc="([^"]*)"([^>]*)>/gi,
		(match, beforeSrc, srcValue, afterSrc) => {
			// Extract filename from src (handle both relative and absolute paths)
			const filename = srcValue.split('/').pop()?.split('?')[0] || srcValue;

			// Skip if it's already a full URL (http/https)
			if (srcValue.startsWith('http://') || srcValue.startsWith('https://')) {
				return match;
			}

			// If we have a Google Drive file ID for this filename, replace it
			if (driveFileMap[filename]) {
				// const driveUrl = `https://drive.google.com/file/d/${driveFileMap[filename]}/view`;
				// const thumbnailUrl = getImageSrc(driveUrl);
				const thumbnailUrl = driveFileMap[filename].thumbnailLink
					? driveFileMap[filename].thumbnailLink.replace(/=s\d+/, '=s4000')
					: `https://drive.google.com/thumbnail?id=${driveFileMap[filename].id}&sz=s4000`;
				return `<img${beforeSrc} src="${thumbnailUrl}"${afterSrc}>`;
			}

			// Log missing files for debugging
			console.warn(`Image file not found in Drive: ${filename}`);
			return match;
		}
	);
}

export function processInlineStyles(htmlContent: string): string {
	// remove all inline styles
	return htmlContent.replace(/ style="[^"]*"/gi, '');
}

/**
 * Process HTML content to replace CSS links with Google Drive URLs
 * @param htmlContent - The HTML content to process
 * @param driveFileMap - Map of filename to Google Drive file ID
 * @returns Processed HTML content with updated CSS links
 */
export function processHtmlCssLinks(htmlContent: string): string {
	// Remove <link rel="stylesheet" href="LaTeXML.css" type="text/css"> and
	// <link rel="stylesheet" href="ltx-article.css" type="text/css">
	// and return
	return htmlContent.replace(/<link[^>]*href="(LaTeXML\.css|ltx-article\.css)"[^>]*>/gi, '');
}

import type { TocEntry } from '$lib/types/Toc.type';

/**
 * Extract and parse table of contents from HTML content and remove it from the HTML
 * @param htmlContent - The HTML content to process
 * @returns Object containing the parsed TOC and the HTML content without the TOC
 */
export function extractTableOfContents(htmlContent: string): {
	toc: TocEntry[];
	htmlContent: string;
} {
	// Find the TOC navigation element
	const tocRegex = /<nav class="ltx_TOC"[\s\S]*?<\/nav>/i;
	const tocMatch = htmlContent.match(tocRegex);

	if (!tocMatch) {
		return { toc: [], htmlContent };
	}

	const tocHtml = tocMatch[0];

	// Remove the TOC from the HTML content
	const cleanedHtml = htmlContent.replace(tocRegex, '');

	// Parse the TOC HTML to extract structure
	const toc = parseTocHtml(tocHtml);

	return { toc, htmlContent: cleanedHtml };
}

/**
 * Parse TOC HTML structure into nested JSON
 * @param tocHtml - The TOC HTML content
 * @returns Parsed TOC structure
 */
function parseTocHtml(tocHtml: string): TocEntry[] {
	const result: TocEntry[] = [];

	// Extract all list items with their nesting level
	const liRegex =
		/<li class="ltx_tocentry ltx_tocentry_(\w+)"[\s\S]*?<a[^>]*href="#([^"]*)"[^>]*>[\s\S]*?<span class="ltx_tag ltx_tag_ref">([^<]*)<\/span>[\s\S]*?<span class="ltx_text[^"]*">([^<]*)<\/span>[\s\S]*?<\/a>/g;

	let match;
	const stack: { entry: TocEntry; level: string }[] = [];

	while ((match = liRegex.exec(tocHtml)) !== null) {
		const [, level, id, tag, title] = match;

		const entry: TocEntry = {
			id: id.trim(),
			title: title.trim(),
			level: level as 'section' | 'subsection' | 'subsubsection',
			tag: tag.trim(),
			children: []
		};

		// Handle nesting based on level
		if (level === 'section') {
			// Top-level section
			result.push(entry);
			stack.length = 0; // Clear stack
			stack.push({ entry, level });
		} else if (level === 'subsection') {
			// Find parent section
			const parent = stack.find((item) => item.level === 'section');
			if (parent) {
				parent.entry.children = parent.entry.children || [];
				parent.entry.children.push(entry);
				// Remove any subsection from stack and add this one
				const sectionIndex = stack.findIndex((item) => item.level === 'section');
				stack.splice(sectionIndex + 1);
				stack.push({ entry, level });
			} else {
				// Fallback: add as top-level if no parent found
				result.push(entry);
				stack.push({ entry, level });
			}
		} else if (level === 'subsubsection') {
			// Find parent subsection
			const parent = stack.find((item) => item.level === 'subsection');
			if (parent) {
				parent.entry.children = parent.entry.children || [];
				parent.entry.children.push(entry);
			} else {
				// Fallback: try to add to section or top-level
				const sectionParent = stack.find((item) => item.level === 'section');
				if (sectionParent) {
					sectionParent.entry.children = sectionParent.entry.children || [];
					sectionParent.entry.children.push(entry);
				} else {
					result.push(entry);
				}
			}
		}
	}

	// Clean up empty children arrays
	const cleanEmptyChildren = (entries: TocEntry[]): TocEntry[] => {
		return entries.map((entry) => {
			const cleanedEntry = { ...entry };
			if (cleanedEntry.children && cleanedEntry.children.length === 0) {
				delete cleanedEntry.children;
			} else if (cleanedEntry.children) {
				cleanedEntry.children = cleanEmptyChildren(cleanedEntry.children);
			}
			return cleanedEntry;
		});
	};

	return cleanEmptyChildren(result);
}
