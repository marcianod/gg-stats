import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import kv after env vars are loaded
import { kv } from '../lib/kv';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db'; // Using the same DB as embeddings
const COLLECTION_NAME = 'duels';
const CONFIG_COLLECTION_NAME = 'config';

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment variables.');
}

async function migrate() {
    console.log('🚀 Starting migration from Vercel KV to MongoDB...');

    const client = new MongoClient(MONGODB_URI!);
    await client.connect();
    const db = client.db(DB_NAME);
    const duelsCollection = db.collection<any>(COLLECTION_NAME);
    const configCollection = db.collection<any>(CONFIG_COLLECTION_NAME);

    console.log('✅ Connected to MongoDB.');

    // 1. Fetch all keys from KV
    console.log('📦 Scanning KV for keys...');
    const allKeys: string[] = [];
    try {
        for await (const key of kv.scanIterator({ match: '*' })) {
            allKeys.push(key);
        }
    } catch (error) {
        console.error('❌ Error scanning KV:', error);
        await client.close();
        return;
    }

    const duelKeys = allKeys.filter(key => !key.startsWith('embedding:') && key !== 'lastSyncTimestamp');
    const lastSyncKey = allKeys.find(key => key === 'lastSyncTimestamp');

    console.log(`Found ${allKeys.length} total keys.`);
    console.log(`- Duels to migrate: ${duelKeys.length}`);
    console.log(`- Last Sync Timestamp found: ${!!lastSyncKey}`);

    // 2. Migrate Duels
    if (duelKeys.length > 0) {
        console.log('🔄 Migrating Duels...');

        let processed = 0;
        const batchSize = 100;

        for (let i = 0; i < duelKeys.length; i += batchSize) {
            const batchKeys = duelKeys.slice(i, i + batchSize);
            const batchValues = await kv.mget(...batchKeys);

            const operations = batchValues.map((value: any, index) => {
                if (!value || !value.gameId) return null;
                return {
                    updateOne: {
                        filter: { _id: value.gameId },
                        update: { $set: value },
                        upsert: true
                    }
                };
            }).filter(op => op !== null);

            if (operations.length > 0) {
                // @ts-ignore
                await duelsCollection.bulkWrite(operations);
            }

            processed += operations.length;
            console.log(`   Migrated ${processed}/${duelKeys.length} duels...`);
        }
        console.log('✅ Duels migration complete.');
    }

    // 3. Migrate Last Sync Timestamp
    if (lastSyncKey) {
        console.log('🔄 Migrating Last Sync Timestamp...');
        const timestamp = await kv.get('lastSyncTimestamp');
        if (timestamp) {
            await configCollection.updateOne(
                { _id: 'lastSyncTimestamp' }, // Use a fixed string ID for config
                { $set: { value: timestamp } },
                { upsert: true }
            );
            console.log(`✅ Last Sync Timestamp saved: ${timestamp}`);
        }
    }

    await client.close();
    console.log('🎉 Migration finished successfully!');
}

migrate();
