import { MongoClient } from 'mongodb';
import { kv } from '@vercel/kv';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// --- Configuration ---
const KEY_PATTERN = 'embedding:*';
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'gg-vector-db-collection';

interface EmbeddingDocument {
    _id: string;
    embedding: number[];
}
// --- End Configuration ---

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable must be set.");
}

const client = new MongoClient(process.env.MONGODB_URI);

async function migrate() {
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection<EmbeddingDocument>(COLLECTION_NAME);
    console.log('✅ Successfully connected to MongoDB.');

    console.log(`Scanning Vercel KV for keys matching pattern: "${KEY_PATTERN}"...`);
    const embeddingKeys = [];
    for await (const key of kv.scanIterator({ match: KEY_PATTERN })) {
      embeddingKeys.push(key);
    }

    if (embeddingKeys.length === 0) {
      console.log('No matching keys found in Vercel KV. Exiting.');
      return;
    }
    
    console.log(`Found ${embeddingKeys.length} keys. Migrating to MongoDB...`);

    const batchSize = 100;
    for (let i = 0; i < embeddingKeys.length; i += batchSize) {
      const keyBatch = embeddingKeys.slice(i, i + batchSize);
      const vectors = await kv.mget(...keyBatch) as number[][];

      const operations = keyBatch.map((key, idx) => ({
        updateOne: {
          filter: { _id: key.replace('embedding:', '') },
          update: { $set: { _id: key.replace('embedding:', ''), embedding: vectors[idx] } },
          upsert: true,
        }
      })).filter(op => op.updateOne.update.$set.embedding);

      if (operations.length > 0) {
        await collection.bulkWrite(operations);
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(embeddingKeys.length / batchSize)}`);
      }
    }

    console.log('✅ Migration from Vercel KV to MongoDB complete!');
  } catch (error) {
    console.error('An error occurred during migration:', error);
  } finally {
    await client.close();
  }
}

migrate();
