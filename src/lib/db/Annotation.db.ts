import { db } from '$lib/db';
import { Annotation } from './schema/Annotation.schema';
import { eq, and } from 'drizzle-orm';

export interface AnnotationData {
	id: string;
	paperId: string;
	userId: string;
	selectedText: string;
	anchorText: string;
	note: string | null;
	highlightColor: string | null;
	startOffset: number;
	endOffset: number;
	createdAt: string;
	updatedAt: string;
}

export async function createAnnotation(data: AnnotationData) {
  console.log('Creating annotation with data:', data);
	return await db.insert(Annotation).values({
		id: data.id,
		paperId: data.paperId,
		userId: data.userId,
		selectedText: data.selectedText,
		anchorText: data.anchorText,
		note: data.note || '',
		highlightColor: data.highlightColor || '#ffeb3b',
		startOffset: data.startOffset,
		endOffset: data.endOffset,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt
	});
}

export async function getAnnotationsByPaperId(paperId: string, userId: string) {
	return await db
		.select()
		.from(Annotation)
		.where(and(eq(Annotation.paperId, paperId), eq(Annotation.userId, userId)));
}

export async function getAnnotationById(id: string) {
	const result = await db.select().from(Annotation).where(eq(Annotation.id, id)).limit(1);
	return result[0] || null;
}

export async function updateAnnotation(id: string, updates: Partial<AnnotationData>) {
	return await db
		.update(Annotation)
		.set({
			...updates,
			updatedAt: new Date().toISOString()
		})
		.where(eq(Annotation.id, id));
}

export async function deleteAnnotation(id: string) {
	return await db.delete(Annotation).where(eq(Annotation.id, id));
}

export async function deleteAnnotationsByPaperId(paperId: string, userId: string) {
	return await db
		.delete(Annotation)
		.where(and(eq(Annotation.paperId, paperId), eq(Annotation.userId, userId)));
}
