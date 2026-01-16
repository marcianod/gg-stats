import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { EMBEDDINGS_COLLECTION as EMBEDDINGS_COLLECTION_NAME } from '../lib/db';

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
    gameId?: string; // Stored as _id in Mongo
    _id?: string;
    rounds?: Round[];
    [key: string]: unknown;
}

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const DUELS_COLLECTION = 'duels';
const EMBEDDINGS_COLLECTION = EMBEDDINGS_COLLECTION_NAME;

async function main() {
    console.log('Starting embedding consistency check (MongoDB Only)...');

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is missing from environment variables!');
        return;
    }

    const client = new MongoClient(MONGODB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const duelsCol = db.collection<Duel>(DUELS_COLLECTION);
        const embeddingsCol = db.collection(EMBEDDINGS_COLLECTION);

        // 1. Fetch all Duels from MongoDB
        console.log('Fetching all Duels from MongoDB...');
        const duels = await duelsCol.find({}).toArray();
        console.log(`Found ${duels.length} total valid duels.`);

        // 2. Identify Expected Embeddings
        const expectedEmbeddings = new Set<string>();
        const skippedRounds = new Set<string>();

        for (const duel of duels) {
            const gameId = duel.gameId || duel._id;
            if (duel.rounds && gameId) {
                duel.rounds.forEach((round, index) => {
                    const roundId = `${gameId}_${index + 1}`;
                    // Check if round is valid for embedding
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

        // 3. Fetch Existing Embeddings from MongoDB
        console.log(`Fetching existing embeddings from '${EMBEDDINGS_COLLECTION}' collection...`);
        const existingDocs = await embeddingsCol.find({}, { projection: { _id: 1 } }).toArray();
        const mongoEmbeddings = new Set(existingDocs.map(d => d._id as unknown as string));
        console.log(`Found ${mongoEmbeddings.size} existing embeddings.`);

        // 4. Calculate Missing
        const missingInMongo: string[] = [];

        for (const id of expectedEmbeddings) {
            if (!mongoEmbeddings.has(id)) missingInMongo.push(id);
        }

        console.log('\n======================================================');
        console.log('                  RESULTS                             ');
        console.log('======================================================');

        if (missingInMongo.length > 0) {
            console.log(`\n⚠️  MISSING EMBEDDINGS FOUND`);
            console.log(`   We have ${missingInMongo.length} LOCATIONS (Rounds) that are missing embeddings.`);
            console.log(`   (These need to be regenerated).`);

            console.log('\n   Breakdown:');
            console.log(`   - Total Locations Needed:  ${expectedEmbeddings.size}`);
            console.log(`   - Total Locations Found: - ${mongoEmbeddings.size}`);
            console.log(`   - Missing:               = ${missingInMongo.length}`);

            // Allow printing first 5 missing for debugging
            if (missingInMongo.length > 0) {
                console.log('   Sample missing IDs:', missingInMongo.slice(0, 5));
            }

        } else {
            console.log(`\n✅  ALL CLEAR!`);
            console.log(`   Every location has a corresponding embedding in the database.`);
        }
        console.log('\n======================================================');

    } catch (error) {
        console.error('Error during check:', error);
    } finally {
        await client.close();
    }
}

main();
