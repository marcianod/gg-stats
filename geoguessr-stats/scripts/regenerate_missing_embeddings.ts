import { kv } from '../lib/kv.ts';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';

// --- Type Definitions ---
interface Round {
    panorama?: {
        lat: number;
        lng: number;
        heading?: number;
        pitch?: number;
        zoom?: number;
    };
    [key: string]: unknown;
}

interface Duel {
    gameId: string;
    rounds?: Round[];
    [key: string]: unknown;
}

// --- Configuration ---
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const DRY_RUN = false; // Set to false to actually generate embeddings

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'gg-vector-db-collection';
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_STREET_VIEW_API_KEY;
const VERTEX_PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID;

if (GOOGLE_API_KEY) {
    console.log(`Loaded Google API Key: ${GOOGLE_API_KEY.substring(0, 5)}...`);
} else {
    console.error('❌ No Google API Key found in environment variables!');
}

// Check for Google Cloud credentials
if (!process.env.GCP_PROJECT_ID || !process.env.GCP_CLIENT_EMAIL || !process.env.GCP_PRIVATE_KEY) {
    console.warn("Warning: Google Cloud credentials are not set in the environment variables. Embedding generation will fail.");
}

const clientOptions = {
    apiEndpoint: 'us-central1-aiplatform.googleapis.com',
    credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    projectId: process.env.GCP_PROJECT_ID,
};

const predictionServiceClient = new PredictionServiceClient(clientOptions);

// --- Helper Functions ---
function getFov(zoom: number | undefined): number {
    if (zoom === undefined) return 90;
    switch (Math.round(zoom)) {
        case 1: return 60;
        case 2: return 40;
        case 3: return 20;
        default: return 90;
    }
}

async function fetchStreetViewImage(lat: number, lng: number, heading: number, pitch: number, zoom: number): Promise<Buffer> {
    if (!GOOGLE_API_KEY) throw new Error("Google Street View API key is missing.");
    const fov = getFov(zoom);
    const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch Street View image: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
}

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
    if (!VERTEX_PROJECT_ID) throw new Error("Vertex AI Project ID is missing.");
    const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/multimodalembedding@001`;
    const instance = { image: { bytesBase64Encoded: imageBuffer.toString('base64') } };
    const instanceValue = helpers.toValue(instance);
    const instances = [instanceValue!];
    const request = { endpoint, instances };
    const [response] = await predictionServiceClient.predict(request);
    if (!response.predictions || response.predictions.length === 0) throw new Error('Failed to get a prediction from the Vertex AI API.');
    const predictionValue = response.predictions[0];
    if (!predictionValue.structValue?.fields?.imageEmbedding?.listValue?.values) throw new Error('API response did not contain a valid image embedding structure.');
    const embeddingList = predictionValue.structValue.fields.imageEmbedding.listValue.values;
    const imageEmbedding = embeddingList.map((v: any) => v.numberValue).filter((n: any): n is number => n !== null && n !== undefined);
    if (imageEmbedding.length === 0) throw new Error('API response did not contain a valid image embedding.');
    return imageEmbedding;
}

async function main() {
    console.log('Starting embedding regeneration...');

    if (!MONGODB_URI) {
        console.error('MONGODB_URI is not set.');
        return;
    }

    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // 1. Fetch all Duels from KV
    console.log('Fetching all duels from KV...');
    const allKeys: string[] = [];

    try {
        for await (const key of kv.scanIterator({ match: '*' })) {
            allKeys.push(key);
        }
    } catch (error) {
        console.error('Error scanning KV:', error);
        return;
    }

    const duelKeys = allKeys.filter(key => !key.startsWith('embedding:') && key !== 'lastSyncTimestamp');

    if (duelKeys.length === 0) {
        console.log('No duels found in KV.');
        await client.close();
        return;
    }

    const duels: Duel[] = [];
    const chunkSize = 500;
    for (let i = 0; i < duelKeys.length; i += chunkSize) {
        const chunkKeys = duelKeys.slice(i, i + chunkSize);
        const chunkDuels = await kv.mget<Duel[]>(...chunkKeys);
        duels.push(...chunkDuels.filter((d): d is Duel => !!d && typeof d === 'object' && 'gameId' in d));
    }
    console.log(`Found ${duels.length} valid duels.`);

    // 2. Fetch Existing Embeddings from MongoDB (Optimization)
    console.log('Fetching existing embedding IDs from MongoDB...');
    const existingIds = new Set<string>();
    const docs = await collection.find({}, { projection: { _id: 1 } }).toArray();
    docs.forEach(doc => existingIds.add(doc._id as unknown as string));
    console.log(`Found ${existingIds.size} existing embeddings in MongoDB.`);

    // 3. Check and Regenerate
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const duel of duels) {
        if (!duel.rounds) continue;

        for (let i = 0; i < duel.rounds.length; i++) {
            const round = duel.rounds[i];
            const roundId = `${duel.gameId}_${i + 1}`;

            // Check In-Memory Set
            if (existingIds.has(roundId)) {
                continue;
            }

            if (!round.panorama || typeof round.panorama.heading === 'undefined' || typeof round.panorama.lat === 'undefined' || typeof round.panorama.lng === 'undefined') {
                console.warn(`Skipping ${roundId} (missing panorama data)`);
                skippedCount++;
                continue;
            }

            if (DRY_RUN) {
                console.log(`[DRY RUN] Would regenerate embedding for ${roundId}`);
                processedCount++;
                continue;
            }

            console.log(`Regenerating embedding for ${roundId}...`);
            try {
                const imageBuffer = await fetchStreetViewImage(
                    round.panorama.lat,
                    round.panorama.lng,
                    round.panorama.heading,
                    round.panorama.pitch ?? 0,
                    round.panorama.zoom ?? 0
                );
                const embedding = await generateEmbedding(imageBuffer);

                await collection.insertOne({ _id: roundId as unknown as any, embedding: embedding });
                console.log(`✅ Saved ${roundId}`);
                processedCount++;
            } catch (error) {
                console.error(`❌ Failed to process ${roundId}:`, error);
                errorCount++;
            }

            // Rate limit slightly to avoid hitting Vertex AI limits too hard
            await new Promise(r => setTimeout(r, 100));
        }
    }

    console.log('\n--- Regeneration Complete ---');
    console.log(`Processed: ${processedCount}`);
    console.log(`Skipped (missing data): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    await client.close();
}

main();
