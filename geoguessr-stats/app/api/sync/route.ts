import { getDuelsCollection, getConfigCollection } from '@/lib/db';
import { NextResponse } from 'next/server';
import { type Duel, type Round } from '@/lib/types';

export const dynamic = 'force-dynamic';

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
    const collection = await getDuelsCollection();

    // Find existing duels by ID
    const existingDocs = await collection.find({ _id: { $in: gameIds } }, { projection: { _id: 1 } }).toArray();
    const existingDuelIds = new Set(existingDocs.map(d => d._id));

    // 3. Filter to get only the new duels
    const newDuels = duels.filter(duel => !existingDuelIds.has(duel.gameId));

    let newRoundIds: string[] = [];
    const bulkOps: any[] = [];

    if (newDuels.length > 0) {
      // 4. Prepare bulk operations
      newDuels.forEach((duel: Duel) => {
        if (duel.gameId) {
          // Remove the temporary 'created' field before saving if needed, though Mongo handles it fine
          // We'll keep consistent behavior with previous impl
          const { created: _created, ...duelToSave } = duel;

          bulkOps.push({
            updateOne: {
              filter: { _id: duel.gameId },
              update: { $set: duelToSave },
              upsert: true
            }
          });
        }
      });

      // Get all round IDs from the new duels
      newRoundIds = newDuels.flatMap(duel => {
        const roundsPlayed = (duel.currentRoundNumber as number) || 0;
        return duel.rounds
          ? duel.rounds.slice(0, roundsPlayed).map((round: Round) => `${duel.gameId}_${round.roundNumber}`)
          : [];
      });

      if (bulkOps.length > 0) {
        await collection.bulkWrite(bulkOps);
      }
    }

    // 5. Always update the timestamp to the latest game seen in the batch
    if (latestTimestamp > 0) {
      const configCollection = await getConfigCollection();
      const currentDoc = await configCollection.findOne({ _id: 'lastSyncTimestamp' });
      const currentLastSync = currentDoc?.value || 0;

      if (latestTimestamp > currentLastSync) {
        await configCollection.updateOne(
          { _id: 'lastSyncTimestamp' },
          { $set: { value: latestTimestamp } },
          { upsert: true }
        );
      }
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
