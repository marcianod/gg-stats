import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import { type Duel } from '@/lib/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://www.geoguessr.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: Request) {
  try {
    const duels = await request.json();

    if (!Array.isArray(duels)) {
      return NextResponse.json({ error: 'Invalid request body, expected an array of duels.' }, { status: 400, headers: CORS_HEADERS });
    }

    if (duels.length === 0) {
      return NextResponse.json({ status: 'success', addedCount: 0 }, { headers: CORS_HEADERS });
    }

    const pipeline = kv.pipeline();
    duels.forEach((duel: Duel) => {
      // Assuming each duel has a unique 'gameId' property which is true
      if (duel.gameId) {
        pipeline.set(duel.gameId, duel);
      }
    });

    pipeline.set('lastSyncTimestamp', Date.now());

    await pipeline.exec();

    // Determine the base URL for the internal API call
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';

    // Fire-and-forget request to the embeddings API
    fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(duels),
    }).catch(error => {
      // Log the error but don't block the response to the user
      console.error('Failed to trigger embedding generation:', error);
    });

    return NextResponse.json({ status: 'success', addedCount: duels.length }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error syncing duels:', error);
    return NextResponse.json({ error: 'Failed to sync duels.' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
