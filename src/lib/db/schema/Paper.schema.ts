import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const Paper = sqliteTable('papers', {
	id: text().primaryKey().notNull(),
	title: text().notNull(),
	abstract: text({ length: 2000 }).notNull(),
	authors: text({ mode: 'json' }).notNull(),
	publishedOn: text().notNull(),
	arxivId: text(),
	arxivUrl: text(),
	userId: text().notNull()
});
