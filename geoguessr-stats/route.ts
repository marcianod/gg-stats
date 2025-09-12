import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// This Duel type should be kept in sync with the one on your page.
// In a larger app, this could be moved to a shared `lib/types.ts` file.
interface Duel {
  gameId: string;
  created?: string;
  startTime?: string;
  [key: string]: unknown;
}

const STATS_FILE_PATH = path.join(process.cwd(), 'data', 'geoguessr_stats.json');

/**
 * Reads the existing stats from the JSON file.
 * Handles cases where the file doesn't exist yet.
 */
async function readStats(): Promise<Duel[]> {
  try {
    const fileContent = await fs.readFile(STATS_FILE_PATH, 'utf-8');
    if (!fileContent) return [];
    const data = JSON.parse(fileContent);
    // The old script used flat(Infinity), so we replicate that for consistency.
    return Array.isArray(data) ? data.flat(Infinity) : [];
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      // File doesn't exist, which is fine. We'll create it.
      return [];
    }
    // For other errors, re-throw to be caught by the main handler.
    throw error;
  }
}

/**
 * Handles POST requests to add new GeoGuessr duels.
 */
export async function POST(request: Request) {
  try {
    const newDuels: Duel[] = await request.json();

    if (!Array.isArray(newDuels)) {
      return NextResponse.json({ status: 'error', message: 'Payload must be an array.' }, { status: 400 });
    }

    if (newDuels.length === 0) {
      return NextResponse.json({ status: 'success', addedCount: 0, message: 'No new duels in payload.' });
    }

    const currentDuels = await readStats();
    const seenGameIds = new Set(currentDuels.map(d => d.gameId));
    
    const duelsToAdd = newDuels.filter(duel => duel?.gameId && !seenGameIds.has(duel.gameId));

    if (duelsToAdd.length === 0) {
      return NextResponse.json({ status: 'success', addedCount: 0, message: 'All duels in payload already exist.' });
    }

    const allDuels = [...currentDuels, ...duelsToAdd];

    // Sort duels by date, newest first, replicating the old script's logic.
    allDuels.sort((a, b) => {
      const dateA = new Date(a.created ?? a.startTime ?? 0).getTime();
      const dateB = new Date(b.created ?? b.startTime ?? 0).getTime();
      return dateB - dateA;
    });

    await fs.mkdir(path.dirname(STATS_FILE_PATH), { recursive: true });
    await fs.writeFile(STATS_FILE_PATH, JSON.stringify(allDuels, null, 2));

    return NextResponse.json({ status: 'success', addedCount: duelsToAdd.length });
  } catch (error) {
    console.error('API Sync Error:', error);
    return NextResponse.json({ status: 'error', message: 'An internal server error occurred.' }, { status: 500 });
  }
}
