import { kv } from '@vercel/kv';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('Starting embedding count verification...');

  try {
    let cursor = 0;
    const keys: string[] = [];
    do {
      const [nextCursor, scannedKeys] = await kv.scan(cursor, { match: 'embedding:*' });
      keys.push(...scannedKeys);
      cursor = Number(nextCursor);
    } while (cursor !== 0);

    const totalEmbeddings = keys.length;
    const uniqueDuelIds = new Set(keys.map(k => k.split('_')[0]));

    console.log(`\n✅ Verification complete.`);
    console.log(`Total embeddings found: ${totalEmbeddings}`);
    console.log(`Total unique duel IDs found: ${uniqueDuelIds.size}`);

  } catch (error) {
    console.error('\n❌ An error occurred during verification.', error);
  }
}

main();
