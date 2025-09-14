import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const keys = await kv.keys('*');
    const duelKeys = keys.filter(key => key !== 'lastSyncTimestamp');

    if (duelKeys.length === 0) {
      return NextResponse.json([]);
    }

    const duels = await kv.mget(duelKeys);
    return NextResponse.json(duels);
  } catch (error) {
    console.error('Error fetching duels:', error);
    return NextResponse.json({ error: 'Failed to fetch duels.' }, { status: 500 });
  }
}
