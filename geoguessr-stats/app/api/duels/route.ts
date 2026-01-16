import { getDuelsCollection } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const collection = await getDuelsCollection();
    const duels = await collection.find({}).toArray();

    console.log(`[Duels API] Found ${duels.length} duels in MongoDB.`);

    const headers = {
      'Content-Type': 'application/json',
      'X-Data-Source': 'MongoDB', // Verification header
    };

    return new NextResponse(JSON.stringify(duels), { status: 200, headers });
  } catch (error) {
    console.error('Error fetching duels:', error);
    return NextResponse.json({ error: 'Failed to fetch duels.' }, { status: 500 });
  }
}
