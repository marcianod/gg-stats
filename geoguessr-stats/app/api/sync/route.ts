import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Duel } from '@/lib/types';

// The main handler for GET requests to fetch the last sync timestamp
export async function GET() {
    try {
        const statsFilePath = path.join(process.cwd(), 'public', 'data', 'geoguessr_stats.json');
        let lastSyncTimestamp = 0;

        try {
            const fileContent = await fs.readFile(statsFilePath, 'utf-8');
            const duels: Duel[] = JSON.parse(fileContent);

            if (duels.length > 0) {
                // Find the most recent duel based on the start time of its first round
                const latestDuel = duels.reduce((latest, current) => {
                    const latestTime = latest.rounds?.[0]?.startTime ? new Date(latest.rounds[0].startTime).getTime() : 0;
                    const currentTime = current.rounds?.[0]?.startTime ? new Date(current.rounds[0].startTime).getTime() : 0;
                    return currentTime > latestTime ? current : latest;
                });

                if (latestDuel.rounds?.[0]?.startTime) {
                    lastSyncTimestamp = new Date(latestDuel.rounds[0].startTime).getTime();
                }
            }
        } catch (error) {
            // File might not exist, which is fine. Timestamp will be 0.
            console.log('Stats file not found or empty, starting sync from the beginning.');
        }

        return NextResponse.json({ lastSyncTimestamp }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });

    } catch (error) {
        console.error('Error fetching sync info:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({
            status: 'error',
            message: errorMessage
        }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }
}

// The main handler for POST requests
export async function POST(request: Request) {
    try {
        const newDuels: Duel[] = await request.json();
        if (!Array.isArray(newDuels)) {
            throw new Error('Invalid data format. Expected an array of duels.');
        }

        const statsFilePath = path.join(process.cwd(), 'public', 'data', 'geoguessr_stats.json');
        
        // Read existing stats
        let existingDuels: Duel[] = [];
        try {
            const fileContent = await fs.readFile(statsFilePath, 'utf-8');
            existingDuels = JSON.parse(fileContent);
        } catch (error) {
            // If the file doesn't exist, we'll create it.
            console.log('Stats file not found. A new one will be created.');
        }

        const existingDuelIds = new Set(existingDuels.map(duel => duel.gameId));
        const addedDuels = newDuels.filter(duel => !existingDuelIds.has(duel.gameId));

        if (addedDuels.length === 0) {
            return NextResponse.json({
                status: 'success',
                message: 'Sync complete. No new duels to add.',
                addedCount: 0,
                totalCount: existingDuels.length
            }, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                }
            });
        }

        const updatedDuels = [...existingDuels, ...addedDuels];

        // Write the updated data back to the file
        await fs.writeFile(statsFilePath, JSON.stringify(updatedDuels, null, 2));

        console.log(`Successfully added ${addedDuels.length} new duels.`);

        return NextResponse.json({
            status: 'success',
            message: `Successfully added ${addedDuels.length} new duels.`,
            addedCount: addedDuels.length,
            totalCount: updatedDuels.length
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });

    } catch (error) {
        console.error('Error during sync:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({
            status: 'error',
            message: errorMessage
        }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        });
    }
}

// Handler for OPTIONS requests (for CORS preflight)
export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
