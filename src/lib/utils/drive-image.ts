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
 * Creates an authenticated Google Drive image URL using your app's API endpoint
 * @param fileId - The Google Drive file ID
 * @param size - Optional size parameter (e.g., 's4000', 's1600')
 * @returns URL to your authenticated image endpoint
 */
export function getAuthenticatedImageSrc(fileId: string, size = 's4000'): string {
	return `/api/drive-image/${fileId}?sz=${size}`;
}

/**
 * Process HTML content to replace image sources with authenticated Google Drive URLs
 * @param htmlContent - The HTML content to process
 * @param driveFileMap - Map of filename to Google Drive file ID
 * @param useAuthenticated - Whether to use authenticated endpoints (default: true)
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
	>,
	useAuthenticated = true
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
				let imageUrl: string;
				
				if (useAuthenticated) {
					// Use authenticated endpoint
					imageUrl = getAuthenticatedImageSrc(driveFileMap[filename].id);
				} else {
					// Use public thumbnail (may not work for private files)
					imageUrl = driveFileMap[filename].thumbnailLink
						? driveFileMap[filename].thumbnailLink!.replace(/=s\d+/, '=s4000')
						: `https://drive.google.com/thumbnail?id=${driveFileMap[filename].id}&sz=s4000`;
				}
				
				return `<img${beforeSrc} src="${imageUrl}"${afterSrc}>`;
			}

			// Log missing files for debugging
			console.warn(`Image file not found in Drive: ${filename}`);
			return match;
		}
	);
}

/**
 * Fallback function for when server-side authenticated images aren't available
 * Creates a direct authenticated fetch for images on the client side
 * @param fileId - Google Drive file ID
 * @param accessToken - User's access token
 * @returns Promise with blob URL or null if failed
 */
export async function fetchAuthenticatedImageBlob(
	fileId: string, 
	accessToken: string
): Promise<string | null> {
	try {
		// Use Google Drive API directly with access token
		const response = await fetch(
			`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
			{
				headers: {
					'Authorization': `Bearer ${accessToken}`,
					'Accept': 'image/*'
				}
			}
		);
		
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.status}`);
		}
		
		const blob = await response.blob();
		
		// Create a blob URL for the image
		const blobUrl = URL.createObjectURL(blob);
		
		// Note: Remember to revoke blob URLs when no longer needed to prevent memory leaks
		// URL.revokeObjectURL(blobUrl);
		
		return blobUrl;
	} catch (error) {
		console.error('Error fetching authenticated image:', error);
		return null;
	}
}

/**
 * Client-side function to replace image sources with authenticated blob URLs
 * Use this when server-side proxy is not available
 * @param element - HTML element containing images
 * @param driveFileMap - Map of filenames to Drive file IDs
 * @param accessToken - User's access token
 */
export async function replaceImagesWithAuthenticatedBlobs(
	element: HTMLElement,
	driveFileMap: Record<string, { id: string; thumbnailLink?: string }>,
	accessToken: string
): Promise<void> {
	const images = element.querySelectorAll('img');
	
	const promises = Array.from(images).map(async (img) => {
		const src = img.getAttribute('src');
		if (!src || src.startsWith('http://') || src.startsWith('https://')) {
			return; // Skip already processed images
		}
		
		const filename = src.split('/').pop()?.split('?')[0];
		if (!filename || !driveFileMap[filename]) {
			return; // Skip if no Drive mapping
		}
		
		const fileId = driveFileMap[filename].id;
		const blobUrl = await fetchAuthenticatedImageBlob(fileId, accessToken);
		
		if (blobUrl) {
			img.src = blobUrl;
			
			// Store the blob URL for cleanup later if needed
			img.dataset.blobUrl = blobUrl;
		}
	});
	
	await Promise.all(promises);
}

/**
 * Clean up blob URLs to prevent memory leaks
 * @param element - HTML element containing images with blob URLs
 */
export function cleanupBlobUrls(element: HTMLElement): void {
	const images = element.querySelectorAll('img[data-blob-url]');
	images.forEach((img: Element) => {
		const htmlImg = img as HTMLImageElement;
		const blobUrl = htmlImg.dataset.blobUrl;
		if (blobUrl) {
			URL.revokeObjectURL(blobUrl);
			delete htmlImg.dataset.blobUrl;
		}
	});
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
