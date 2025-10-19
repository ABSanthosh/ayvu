import { openDB } from 'idb';
import { HNSW } from 'mememo';

// Utility function to convert typed arrays to plain number arrays
function toPlainArray(vector: number[] | Float32Array | Float64Array): number[] {
	return Array.from(vector);
}

// A wrapper using idb and MeMemo to build a persistent vector database
class VectorIDB {
	private dbPromise: Promise<any>;
	private index: HNSW;
	private dimension: number;
	private isInitialized: Promise<void>;

	/**
	 * Creates a new VectorIDB instance, initializes IndexedDB, and sets up MeMemo's HNSW index.
	 *
	 * @param options - Configuration object for the VectorIDB constructor
	 * @param options.vectorPath - The path or identifier for vector data storage
	 * @param options.distanceFunction - Distance function for HNSW ('cosine' or 'cosine-normalized')
	 * @param options.dimension - Dimension of the vectors
	 * @param options.m - Max number of neighbors per node (default: 16)
	 * @param options.efConstruction - Neighbors to consider in construction (default: 100)
	 * @param options.mMax0 - Max neighbors at layer 0 (default: 2 * m)
	 * @param options.ml - Normalizer for layer overlap (default: 1 / ln(m))
	 * @param options.seed - Random seed for reproducibility
	 *
	 * @remarks
	 * Initializes an IndexedDB database named 'VectorIDB' with version 1.
	 * Creates an object store 'vectors' with an auto-incrementing 'id' key path.
	 * Sets up MeMemo's HNSW index with useIndexedDB: false, as storage is handled by idb.
	 */
	constructor({
		vectorPath,
		distanceFunction = 'cosine',
		dimension,
		m,
		efConstruction,
		mMax0,
		ml,
		seed
	}: {
		vectorPath: string;
		distanceFunction?: 'cosine' | 'cosine-normalized';
		dimension: number;
		m?: number;
		efConstruction?: number;
		mMax0?: number;
		ml?: number;
		seed?: number;
	}) {
		this.dimension = dimension;

		this.index = new HNSW({
			distanceFunction,
			m,
			efConstruction,
			mMax0,
			ml,
			seed,
			useIndexedDB: false // Storage handled by idb
		});

		this.dbPromise = openDB(vectorPath, 1, {
			upgrade(db) {
				if (!db.objectStoreNames.contains('vectors')) {
					db.createObjectStore('vectors', {
						keyPath: 'id',
						autoIncrement: true
					});
				}
			}
		});

		// Track initialization
		this.isInitialized = this.loadFromDB();
	}

	/**
	 * Loads existing vectors from IndexedDB into the HNSW index.
	 */
	private async loadFromDB(): Promise<void> {
		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readonly');
		const store = tx.objectStore('vectors');
		const allVectors = await store.getAll();

		console.log('Loaded vectors from IndexedDB:', allVectors.length, 'items');

		if (allVectors.length > 0) {
			const validVectors = allVectors.filter((item: any) => !item.isDeleted);
			console.log('Valid (non-deleted) vectors:', validVectors.length);

			const keys = validVectors.map((item: any) => item.id.toString());
			const values = validVectors.map((item: any) => toPlainArray(item.vector));

			if (validVectors.length > 0) {
				await this.index.bulkInsert(keys, values);
				console.log('Inserted vectors into HNSW index:', keys.length);
			}
		}
		await tx.done;
	}

	/**
	 * Waits for initialization to complete.
	 */
	public async waitForInitialization(): Promise<void> {
		await this.isInitialized;
	}

	/**
	 * Inserts a vector with associated metadata into the database and HNSW index.
	 *
	 * @param vector - The vector to insert (array of numbers or typed array)
	 * @param metadata - Associated metadata object
	 * @returns The ID of the inserted vector
	 * @throws Error if vector dimension is incorrect or ID already exists
	 */
	async insert(vector: number[] | Float32Array | Float64Array, metadata: object): Promise<string> {
		await this.isInitialized; // Ensure DB is ready
		const plainVector = toPlainArray(vector);
		if (plainVector.length !== this.dimension) {
			throw new Error(`Vector dimension must be ${this.dimension}, got ${plainVector.length}`);
		}

		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readwrite');
		const store = tx.objectStore('vectors');

		// Generate a new ID
		const id = await store.add({ vector: plainVector, metadata, isDeleted: false });
		const idStr = id.toString();

		// Check if key exists in HNSW
		if (await this.index.nodes.has(idStr)) {
			await tx.done;
			throw new Error(`Key ${idStr} already exists in the index`);
		}

		// Insert into HNSW index
		await this.index.insert(idStr, plainVector);

		await tx.done;
		return idStr;
	}

	/**
	 * Queries the k-nearest neighbors for a given vector.
	 *
	 * @param query - The query vector (array of numbers or typed array)
	 * @param k - Number of nearest neighbors to return
	 * @returns Object containing arrays of keys, distances, and metadata
	 * @throws Error if query vector dimension is incorrect
	 */
	async query(
		query: number[] | Float32Array | Float64Array,
		k: number
	): Promise<{
		keys: string[];
		distances: number[];
		metadata: object[];
	}> {
		await this.isInitialized; // Ensure DB is ready
		const plainQuery = toPlainArray(query);
		if (plainQuery.length !== this.dimension) {
			throw new Error(`Query vector dimension must be ${this.dimension}, got ${plainQuery.length}`);
		}

		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readonly');
		const store = tx.objectStore('vectors');

		// Check if index is empty
		if (this.index.entryPointKey === null) {
			console.warn('HNSW index is empty, returning empty results');
			await tx.done;
			return { keys: [], distances: [], metadata: [] };
		}

		// Query HNSW index for nearest neighbors
		const { keys, distances } = await this.index.query(plainQuery, k);

		// Retrieve metadata for matching vectors
		const metadata = await Promise.all(
			keys.map(async (key) => {
				const item = await store.get(parseInt(key));
				return item.metadata;
			})
		);

		await tx.done;
		return { keys, distances, metadata };
	}

	/**
	 * Marks a vector as deleted in the database and HNSW index.
	 *
	 * @param id - The ID of the vector to delete
	 * @returns Boolean indicating success
	 * @throws Error if the ID does not exist
	 */
	async delete(id: string): Promise<boolean> {
		await this.isInitialized; // Ensure DB is ready
		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readwrite');
		const store = tx.objectStore('vectors');

		const item = await store.get(parseInt(id));
		if (!item) {
			await tx.done;
			throw new Error(`Vector with ID ${id} does not exist`);
		}

		// Mark as deleted in IndexedDB
		item.isDeleted = true;
		await store.put(item);

		// Mark as deleted in HNSW
		await this.index.markDeleted(id);

		await tx.done;
		return true;
	}

	/**
	 * Clears all vectors from the database and HNSW index.
	 */
	async clear(): Promise<void> {
		await this.isInitialized; // Ensure DB is ready
		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readwrite');
		const store = tx.objectStore('vectors');

		await store.clear();
		await this.index.clear();

		await tx.done;
	}

	/**
	 * Checks if the vector database is empty (contains no non-deleted vectors).
	 *
	 * @returns Boolean indicating whether the database is empty
	 */
	async isEmpty(): Promise<boolean> {
		await this.isInitialized; // Ensure DB is ready
		
		// Check if HNSW index has an entry point (indicates non-empty)
		if (this.index.entryPointKey !== null) {
			return false;
		}

		// Double-check by counting non-deleted vectors in IndexedDB
		const db = await this.dbPromise;
		const tx = db.transaction('vectors', 'readonly');
		const store = tx.objectStore('vectors');
		const allVectors = await store.getAll();
		
		const nonDeletedCount = allVectors.filter((item: any) => !item.isDeleted).length;
		await tx.done;
		
		return nonDeletedCount === 0;
	}
}

export default VectorIDB;
