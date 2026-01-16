import { kv } from '../lib/kv.ts';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

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

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'gg-vector-db-collection';

async function main() {
    console.log('Starting embedding consistency check...');

    // 1. Environment Check
    const kvUrl = process.env.KV_REST_API_URL;
    if (!kvUrl) {
        console.error('❌ KV_REST_API_URL is missing from environment variables!');
        return;
    }
    console.log(`Connecting to KV at: ${kvUrl.substring(0, 15)}...`);

    // 2. Fetch all Duels from KV
    console.log('Fetching all keys from KV...');
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

    console.log(`Total keys in KV: ${allKeys.length}`);
    console.log(`Potential duel keys (excluding 'embedding:*' and 'lastSyncTimestamp'): ${duelKeys.length}`);

    if (duelKeys.length === 0) {
        console.log('No duels found in KV.');
        return;
    }

    // Fetch duel contents in chunks
    const duels: Duel[] = [];
    const chunkSize = 100; // Smaller chunk size to be safe
    let invalidDuels = 0;

    for (let i = 0; i < duelKeys.length; i += chunkSize) {
        const chunkKeys = duelKeys.slice(i, i + chunkSize);
        try {
            const chunkDuels = await kv.mget<Duel[]>(...chunkKeys);
            chunkDuels.forEach((d, idx) => {
                if (d && typeof d === 'object' && 'gameId' in d) {
                    duels.push(d);
                } else {
                    invalidDuels++;
                    if (invalidDuels <= 3) {
                        console.log(`Skipping invalid duel key: ${chunkKeys[idx]} (Value: ${JSON.stringify(d)?.substring(0, 50)}...)`);
                    }
                }
            });
        } catch (e) {
            console.error(`Error fetching chunk ${i}:`, e);
        }
    }
    console.log(`Found ${duels.length} valid duels.`);
    if (invalidDuels > 0) console.log(`Skipped ${invalidDuels} keys that did not contain valid Duel data.`);

    // 2. Identify Expected Embeddings
    const expectedEmbeddings = new Set<string>();
    const skippedRounds = new Set<string>();

    for (const duel of duels) {
        if (duel.rounds) {
            duel.rounds.forEach((round, index) => {
                const roundId = `${duel.gameId}_${index + 1}`;
                // Check if round is valid for embedding (logic from generate_embeddings.ts)
                if (round.panorama &&
                    typeof round.panorama.heading !== 'undefined' &&
                    typeof round.panorama.lat !== 'undefined' &&
                    typeof round.panorama.lng !== 'undefined') {
                    expectedEmbeddings.add(roundId);
                } else {
                    skippedRounds.add(roundId);
                }
            });
        }
    }
    console.log(`Expected Embeddings: ${expectedEmbeddings.size}`);
    console.log(`Skipped Rounds (no panorama): ${skippedRounds.size}`);

    // 3. Fetch Existing Embeddings from KV
    console.log('Scanning KV for existing embeddings...');
    const kvEmbeddings = new Set<string>();
    try {
        for await (const key of kv.scanIterator({ match: 'embedding:*' })) {
            kvEmbeddings.add(key.replace('embedding:', ''));
        }
    } catch (error) {
        console.error('Error scanning KV embeddings:', error);
    }
    console.log(`Found ${kvEmbeddings.size} embeddings in KV.`);

    // 4. Fetch Existing Embeddings from MongoDB
    let mongoEmbeddings = new Set<string>();
    if (MONGODB_URI) {
        try {
            const client = new MongoClient(MONGODB_URI);
            await client.connect();
            const db = client.db(DB_NAME);
            const collection = db.collection(COLLECTION_NAME);
            const docs = await collection.find({}, { projection: { _id: 1 } }).toArray();
            docs.forEach(d => mongoEmbeddings.add(d._id as unknown as string));
            console.log(`Found ${mongoEmbeddings.size} embeddings in MongoDB.`);
            await client.close();
        } catch (e) {
            console.error('Failed to check MongoDB:', e);
        }
    } else {
        console.log('MONGODB_URI not set, skipping Mongo check.');
    }

    // 5. Calculate Missing
    const missingInKv: string[] = [];
    const missingInMongo: string[] = [];

    for (const id of expectedEmbeddings) {
        if (!kvEmbeddings.has(id)) missingInKv.push(id);
        if (MONGODB_URI && !mongoEmbeddings.has(id)) missingInMongo.push(id);
    }

    console.log('\n======================================================');
    console.log('               STATUS REPORT                          ');
    console.log('======================================================');
    console.log(`\n🔎 DATA SOURCE 1: Upstash (Game Storage)`);
    console.log(`   - Found ${duels.length} total games (Duels).`);
    console.log(`   - Those games contain ${expectedEmbeddings.size} total rounds (Locations) that need embeddings.`);

    console.log(`\n🔎 DATA SOURCE 2: MongoDB (Vector Database)`);
    console.log(`   - Found ${mongoEmbeddings.size} existing embeddings.`);

    console.log(`\n======================================================`);
    console.log('                  RESULTS                             ');
    console.log('======================================================');

    if (missingInMongo.length > 0) {
        console.log(`\n⚠️  MISSING EMBEDDINGS FOUND`);
        console.log(`   We have ${missingInMongo.length} LOCATIONS (Rounds) that are missing embeddings.`);
        console.log(`   (These need to be regenerated).`);

        console.log('\n   Breakdown:');
        console.log(`   - Total Locations Needed:  ${expectedEmbeddings.size}`);
        console.log(`   - Total Locations Found: - ${mongoEmbeddings.size}`);
        console.log(`   - Missing:               = ${Math.max(0, expectedEmbeddings.size - mongoEmbeddings.size)} (Approx)`);

        console.log(`\n   Exact Missing List Calculation: ${missingInMongo.length}`);
        console.log(`   (This is the exact number of operations the regeneration script will perform).`);

    } else {
        console.log(`\n✅  ALL CLEAR!`);
        console.log(`   Every location has a corresponding embedding in the database.`);
    }
    console.log('\n======================================================');
}

main();
