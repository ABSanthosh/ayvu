export interface Chunk {
	text: string;
	metadata: {
		sectionId: string;
		title: string;
		hierarchy: 'section' | 'subsection' | 'subsubsection';
		parentSection?: string;
	};
}

export type EmbeddingsFile = {
	metadata: Chunk;
	embedding: number[];
}[];
