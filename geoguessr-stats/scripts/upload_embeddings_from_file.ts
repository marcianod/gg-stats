import fs from 'fs/promises';
import path from 'path';
import { kv } from '@vercel/kv';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const EMBEDDINGS_FILE_PATH = path.join(process.cwd(), 'public/data/round_embeddings.json');
const BATCH_SIZE = 100; // Process 100 embeddings at a time

async function main() {
  console.log('Starting embedding upload process...');

  let localEmbeddings: { [roundId: string]: number[] };
  try {
    // Stage 1: Load local embeddings file
    console.log(`Reading local embeddings file from: ${EMBEDDINGS_FILE_PATH}`);
    const fileContent = await fs.readFile(EMBEDDINGS_FILE_PATH, 'utf-8');
    localEmbeddings = JSON.parse(fileContent);
    console.log('Successfully loaded local embeddings file into memory.');
  } catch (error) {
    console.error('Fatal: Could not read the local round_embeddings.json file.', error);
    return;
  }

  const allRoundIds = Object.keys(localEmbeddings);
  const totalEmbeddings = allRoundIds.length;
  const totalBatches = Math.ceil(totalEmbeddings / BATCH_SIZE);

  if (totalEmbeddings === 0) {
    console.log('No embeddings found to upload.');
    return;
  }

  console.log(`\nFound ${totalEmbeddings} embeddings. Preparing to upload in ${totalBatches} batches of ${BATCH_SIZE}.`);

  // Stage 2: Upload in batches
  for (let i = 0; i < totalBatches; i++) {
    const batchStart = i * BATCH_SIZE;
    const batchEnd = batchStart + BATCH_SIZE;
    const batchIds = allRoundIds.slice(batchStart, batchEnd);

    const embeddingsBatch: { [key: string]: number[] } = {};
    for (const roundId of batchIds) {
      embeddingsBatch[`embedding:${roundId}`] = localEmbeddings[roundId];
    }

    console.log(`Uploading batch ${i + 1} of ${totalBatches} (${batchIds.length} embeddings)...`);

    try {
      await kv.mset(embeddingsBatch);
    } catch (error) {
      // This generic catch block prevents the data payload from ever being printed.
      console.error(`\n❌ An error occurred while uploading batch ${i + 1}.`);
      console.error("The script will now stop. Please check Vercel's logs, your KV usage, and network connection.");
      return; // Stop the entire process on the first failure.
    }
  }

  // Stage 3: Final confirmation
  console.log('\n✅ Upload finished successfully.');
  console.log(`Total embeddings uploaded: ${totalEmbeddings}.`);
}

main();