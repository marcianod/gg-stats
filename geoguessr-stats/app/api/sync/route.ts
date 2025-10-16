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
    const duels: Duel[] = await request.json();

    if (!Array.isArray(duels)) {
      return NextResponse.json({ error: 'Invalid request body, expected an array of duels.' }, { status: 400, headers: CORS_HEADERS });
    }

    if (duels.length === 0) {
      return NextResponse.json({ status: 'success', addedCount: 0, roundsToProcess: [] }, { headers: CORS_HEADERS });
    }

    // 1. Find the most recent game timestamp from the entire batch
    const latestTimestamp = Math.max(...duels.map(duel => duel.created ? new Date(duel.created).getTime() : 0));

    // 2. Check which duels already exist in the database
    const gameIds = duels.map(d => d.gameId);
    const existingDuels = await kv.mget<Duel[]>(...gameIds);
    const existingDuelIds = new Set(existingDuels.filter(Boolean).map(d => d.gameId));

    // 3. Filter to get only the new duels
    const newDuels = duels.filter(duel => !existingDuelIds.has(duel.gameId));

    const pipeline = kv.pipeline();
    let newRoundIds: string[] = [];
    let pipelineHasCommands = false;

    if (newDuels.length > 0) {
      // 4. Add new duels to the pipeline
      newDuels.forEach((duel: Duel) => {
        if (duel.gameId) {
          // Remove the temporary 'created' field before saving
          const { created, ...duelToSave } = duel;
          pipeline.set(duel.gameId, duelToSave);
          pipelineHasCommands = true;

          // Add new rounds to the processing queue
          if (duel.rounds) {
            for (let i = 0; i < duel.rounds.length; i++) {
              newRoundIds.push(`${duel.gameId}_${i + 1}`);
            }
          }
        }
      });
    }

    // 5. Always update the timestamp to the latest game seen in the batch
    if (latestTimestamp > 0) {
        const currentLastSync = await kv.get<number>('lastSyncTimestamp') || 0;
        if (latestTimestamp > currentLastSync) {
            pipeline.set('lastSyncTimestamp', latestTimestamp);
            pipelineHasCommands = true;
        }
    }

    if (pipelineHasCommands) {
        await pipeline.exec();
    }

    return NextResponse.json({
      status: 'success',
      addedCount: newDuels.length,
      roundsToProcess: newRoundIds
    }, { headers: CORS_HEADERS });

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
