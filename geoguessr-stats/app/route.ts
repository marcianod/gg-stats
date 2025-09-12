import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the path to the data directory and the stats file
const DATA_DIR = path.join(process.cwd(), 'data');
const STATS_FILE_PATH = path.join(DATA_DIR, 'geoguessr_stats.json');

// Define a type for the duel object for better type safety
interface Duel {
    gameId: string;
    created?: string;
    startTime?: string;
    // Allow other properties
    [key: string]: any;
}

/**
 * Helper function to robustly read and parse the stats file.
 * Mimics the robustJsonParseAndFlatten function from the Apps Script.
 * @returns {Promise<Duel[]>} A promise that resolves to an array of duels.
 */
async function readStatsFile(): Promise<Duel[]> {
    try {
        const fileContent = await fs.readFile(STATS_FILE_PATH, 'utf-8');
        if (!fileContent || fileContent.trim() === '') {
            return [];
        }
        const data = JSON.parse(fileContent);
        // The original script uses flat(Infinity), which is good practice.
        if (Array.isArray(data)) {
            return data.flat(Infinity);
        }
        return [];
    } catch (error: any) {
        // If the file doesn't exist, it's not an error for the first sync.
        // Return an empty array.
        if (error.code === 'ENOENT') {
            return [];
        }
        // For other errors (like JSON parsing), log it and treat as empty.
        console.warn("Error reading or parsing stats file:", error);
        return [];
    }
}

/**
 * Handles POST requests to add new GeoGuessr duel data.
 */
export async function POST(request: Request) {
    try {
        const newDuels: unknown = await request.json();

        if (!Array.isArray(newDuels) || newDuels.length === 0) {
            return NextResponse.json({ status: 'success', addedCount: 0 });
        }

        const currentDuels = await readStatsFile();
        const seenGameIds = new Set(currentDuels.map(d => d.gameId));

        let addedCount = 0;
        newDuels.forEach((duel: Duel) => {
            // Add only if the duel has a gameId and it's not a duplicate
            if (duel && duel.gameId && !seenGameIds.has(duel.gameId)) {
                currentDuels.push(duel);
                seenGameIds.add(duel.gameId);
                addedCount++;
            }
        });

        // Sort all duels by date in descending order (newest first)
        currentDuels.sort((a, b) => {
            const dateA = new Date(a.created || a.startTime || 0).getTime();
            const dateB = new Date(b.created || b.startTime || 0).getTime();
            return dateB - dateA;
        });

        // Ensure the data directory exists before writing the file
        await fs.mkdir(DATA_DIR, { recursive: true });
        // Write the updated data back to the file
        await fs.writeFile(STATS_FILE_PATH, JSON.stringify(currentDuels, null, 2));

        return NextResponse.json({ status: 'success', addedCount: addedCount });

    } catch (error) {
        console.error('API Sync Error:', error);
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json(
            { status: 'error', message: `Invalid request: ${message}` },
            { status: 500 }
        );
    }
}
