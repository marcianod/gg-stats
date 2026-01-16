import { getConfigCollection } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://www.geoguessr.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  try {
    const collection = await getConfigCollection();
    const doc = await collection.findOne({ _id: 'lastSyncTimestamp' });
    const timestamp = doc?.value || 0;

    return NextResponse.json({ lastSync: timestamp }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error fetching last sync timestamp:', error);
    return NextResponse.json({ error: 'Failed to fetch last sync timestamp.' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
