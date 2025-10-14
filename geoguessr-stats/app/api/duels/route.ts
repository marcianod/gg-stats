import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const keys: string[] = [];
    for await (const key of kv.scanIterator()) {
      keys.push(key);
    }

    const duelKeys = keys.filter(key => !key.startsWith('embedding:') && key !== 'lastSyncTimestamp');

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
