import { db } from '$lib/db';
import { Paper } from './schema/Paper.schema';
import { eq, and } from 'drizzle-orm';

export interface PaperData {
	id: string;
	title: string;
	abstract: string;
	authors: string[];
	publishedOn: string;
	arxivId?: string;
	arxivUrl?: string;
	userId: string;
}

export async function createPaper({
	id,
	title,
	abstract,
	authors,
	publishedOn,
	arxivId,
	arxivUrl,
	userId
}: PaperData) {
	return await db.insert(Paper).values({
		id,
		title,
		abstract,
		authors: JSON.stringify(authors),
		publishedOn,
		arxivId,
		arxivUrl,
		userId
	});
}

export async function getAllPapers() {
	const dbPapers = await db.select().from(Paper);
	
	// Transform database papers to match expected format
	return dbPapers.map(paper => ({
		id: paper.id,
		title: paper.title,
		authors: JSON.parse(paper.authors as string),
		published: paper.publishedOn,
		abstract: paper.abstract,
		arxivId: paper.arxivId,
		arxivUrl: paper.arxivUrl,
		userId: paper.userId,
		preview: 'src' // You might want to update this based on your needs
	}));
}

export async function getPapersByUserId(userId: string) {
	const dbPapers = await db.select().from(Paper).where(eq(Paper.userId, userId));
	
	// Transform database papers to match expected format
	return dbPapers.map(paper => ({
		id: paper.id,
		title: paper.title,
		authors: JSON.parse(paper.authors as string),
		published: paper.publishedOn,
		abstract: paper.abstract,
		arxivId: paper.arxivId,
		arxivUrl: paper.arxivUrl,
		userId: paper.userId,
		preview: 'src'
	}));
}

export async function getPaperById(id: string) {
	const result = await db.select().from(Paper).where(eq(Paper.id, id)).limit(1);
	const paper = result[0];
	
	if (!paper) return null;
	
	return {
		id: paper.id,
		title: paper.title,
		authors: JSON.parse(paper.authors as string),
		published: paper.publishedOn,
		abstract: paper.abstract,
		arxivId: paper.arxivId,
		arxivUrl: paper.arxivUrl,
		userId: paper.userId,
		preview: 'src'
	};
}

export async function getPaperByArxivId(arxivId: string) {
	const result = await db.select().from(Paper).where(eq(Paper.arxivId, arxivId)).limit(1);
	const paper = result[0];
	
	if (!paper) return null;
	
	return {
		id: paper.id,
		title: paper.title,
		authors: JSON.parse(paper.authors as string),
		published: paper.publishedOn,
		abstract: paper.abstract,
		arxivId: paper.arxivId,
		arxivUrl: paper.arxivUrl,
		userId: paper.userId,
		preview: 'src'
	};
}

export async function getPaperByArxivIdAndUserId(arxivId: string, userId: string) {
	const result = await db.select().from(Paper)
		.where(and(eq(Paper.arxivId, arxivId), eq(Paper.userId, userId)))
		.limit(1);
	const paper = result[0];
	
	if (!paper) return null;
	
	return {
		id: paper.id,
		title: paper.title,
		authors: JSON.parse(paper.authors as string),
		published: paper.publishedOn,
		abstract: paper.abstract,
		arxivId: paper.arxivId,
		arxivUrl: paper.arxivUrl,
		userId: paper.userId,
		preview: 'src'
	};
}

export async function updatePaper(id: string, updates: Partial<PaperData>) {
	const updateData: any = { ...updates };
	
	// Convert authors array to JSON string if provided
	if (updates.authors) {
		updateData.authors = JSON.stringify(updates.authors);
	}
	
	return await db.update(Paper).set(updateData).where(eq(Paper.id, id));
}

export async function deletePaper(id: string) {
	return await db.delete(Paper).where(eq(Paper.id, id));
}
