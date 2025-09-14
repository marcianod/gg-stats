import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://www.geoguessr.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  try {
    const timestamp = await kv.get('lastSyncTimestamp');
    return NextResponse.json({ lastSync: timestamp || 0 }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('Error fetching last sync timestamp:', error);
    return NextResponse.json({ error: 'Failed to fetch last sync timestamp.' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
