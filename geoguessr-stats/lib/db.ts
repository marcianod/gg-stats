import { MongoClient, Db, Collection } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'duels';
const CONFIG_COLLECTION_NAME = 'config';
export const EMBEDDINGS_COLLECTION = 'embeddings';

// Check moved to getDb to allow scripts to load env first
// if (!MONGODB_URI) {
//     throw new Error('MONGODB_URI environment variable must be set.');
// }

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getDb(): Promise<Db> {
    if (cachedDb) {
        return cachedDb;
    }

    if (!cachedClient) {
        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI environment variable must be set.');
        }
        cachedClient = new MongoClient(MONGODB_URI!);
        await cachedClient.connect();
        console.log('Connected to MongoDB');
    }

    cachedDb = cachedClient.db(DB_NAME);
    return cachedDb;
}

// Basic Document type for generic collections if no specifc type is needed
import { Document } from 'mongodb';

export async function getDuelsCollection(): Promise<Collection<Document>> {
    const db = await getDb();
    return db.collection(COLLECTION_NAME);
}

export async function getConfigCollection(): Promise<Collection<Document>> {
    const db = await getDb();
    return db.collection(CONFIG_COLLECTION_NAME);
}

export async function getEmbeddingsCollection(): Promise<Collection<Document>> {
    const db = await getDb();
    return db.collection(EMBEDDINGS_COLLECTION);
}

// Helper to close connection (mainly for scripts)
export async function closeDb() {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
        cachedDb = null;
    }
}
