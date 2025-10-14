import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const allKeys: string[] = [];
    for await (const key of kv.scanIterator({ match: '*' })) {
      allKeys.push(key);
    }
    console.log(`[Duels API] Found ${allKeys.length} total keys. Sample keys:`, allKeys.slice(0, 10));

    const duelKeys = allKeys.filter(key => !key.startsWith('embedding:') && key !== 'lastSyncTimestamp');
    console.log(`[Duels API] Found ${duelKeys.length} duel keys after filtering.`);

    if (duelKeys.length === 0) {
      return NextResponse.json([]);
    }

    const duels: unknown[] = [];
    const chunkSize = 500;

    for (let i = 0; i < duelKeys.length; i += chunkSize) {
      const chunkKeys = duelKeys.slice(i, i + chunkSize);
      const chunkDuels = await kv.mget(...chunkKeys);
      duels.push(...chunkDuels);
    }

    return NextResponse.json(duels);
  } catch (error) {
    console.error('Error fetching duels:', error);
    return NextResponse.json({ error: 'Failed to fetch duels.' }, { status: 500 });
  }
}
