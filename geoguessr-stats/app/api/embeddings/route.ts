import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let cursor = 0;
    const keys: string[] = [];
    do {
      const [nextCursor, scannedKeys] = await kv.scan(cursor, { match: 'embedding:*' });
      keys.push(...scannedKeys);
      cursor = Number(nextCursor);
    } while (cursor !== 0);

    if (keys.length === 0) {
      return NextResponse.json({});
    }

    const embeddings = await kv.mget(...keys);
    
    const embeddingsObject = keys.reduce((acc, key, index) => {
      const roundId = key.replace('embedding:', '');
      acc[roundId] = embeddings[index] as number[];
      return acc;
    }, {} as { [key: string]: number[] });

    return NextResponse.json(embeddingsObject);
  } catch (error) {
    console.error('Failed to fetch embeddings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
