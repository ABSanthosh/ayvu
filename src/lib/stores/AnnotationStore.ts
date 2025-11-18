import { writable } from 'svelte/store';
import type { AnnotationData } from '$lib/db/Annotation.db';

export interface AnnotationStore {
	annotations: AnnotationData[];
	activeAnnotationId: string | null;
	isCreating: boolean;
}

function createAnnotationStore() {
	const { subscribe, set, update } = writable<AnnotationStore>({
		annotations: [],
		activeAnnotationId: null,
		isCreating: false
	});

	return {
		subscribe,
		setAnnotations: (annotations: AnnotationData[]) =>
			update((store) => ({ ...store, annotations })),
		addAnnotation: (annotation: AnnotationData) =>
			update((store) => ({
				...store,
				annotations: [...store.annotations, annotation]
			})),
		updateAnnotation: (id: string, updates: Partial<AnnotationData>) =>
			update((store) => ({
				...store,
				annotations: store.annotations.map((a) => (a.id === id ? { ...a, ...updates } : a))
			})),
		removeAnnotation: (id: string) =>
			update((store) => ({
				...store,
				annotations: store.annotations.filter((a) => a.id !== id)
			})),
		setActiveAnnotation: (id: string | null) =>
			update((store) => ({ ...store, activeAnnotationId: id })),
		setIsCreating: (isCreating: boolean) => update((store) => ({ ...store, isCreating })),
		reset: () =>
			set({
				annotations: [],
				activeAnnotationId: null,
				isCreating: false
			})
	};
}

export const annotationStore = createAnnotationStore();
