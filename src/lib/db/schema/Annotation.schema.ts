import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const Annotation = sqliteTable('annotations', {
	id: text().primaryKey().notNull(),
	paperId: text().notNull(),
	userId: text().notNull(),
	selectedText: text().notNull(),
	anchorText: text().notNull(), // Text around selection for anchoring
	note: text(), // User's note/comment
	highlightColor: text().default('#ffeb3b'), // Color for highlight
	startOffset: integer().notNull(), // Character offset in the document
	endOffset: integer().notNull(), // Character offset in the document
	createdAt: text().notNull(),
	updatedAt: text().notNull()
});
