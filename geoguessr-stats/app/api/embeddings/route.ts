import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const keys = await kv.keys('embedding:*');
    if (keys.length === 0) {
      return NextResponse.json({});
    }
    const embeddings = await kv.mget(...keys);
    
    const embeddingsObject = keys.reduce((acc, key, index) => {
      const roundId = key.replace('embedding:', '');
      acc[roundId] = embeddings[index];
      return acc;
    }, {} as { [key: string]: any });

    return NextResponse.json(embeddingsObject);
  } catch (error) {
    console.error('Failed to fetch embeddings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
