import { kv } from '@vercel/kv';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const KEY_PATTERN = 'embedding:*';
const BATCH_SIZE = 100;

async function cleanup() {
  try {
    console.log(`Scanning Vercel KV for keys to delete with pattern: "${KEY_PATTERN}"...`);
    const keysToDelete: string[] = [];
    for await (const key of kv.scanIterator({ match: KEY_PATTERN })) {
      keysToDelete.push(key);
    }

    if (keysToDelete.length === 0) {
      console.log('No matching keys found to delete. Exiting.');
      return;
    }
    
    console.log(`Found ${keysToDelete.length} keys to delete. Proceeding in batches...`);

    for (let i = 0; i < keysToDelete.length; i += BATCH_SIZE) {
      const keyBatch = keysToDelete.slice(i, i + BATCH_SIZE);
      
      if (keyBatch.length > 0) {
        await kv.del(...keyBatch);
        console.log(`Deleted batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(keysToDelete.length / BATCH_SIZE)}`);
      }
    }

    console.log('✅ Cleanup of Vercel KV embeddings complete!');

  } catch (error) {
    console.error('An error occurred during cleanup:', error);
  }
}

cleanup();
