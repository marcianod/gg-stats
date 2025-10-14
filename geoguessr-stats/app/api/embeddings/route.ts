import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const keys: string[] = [];
    for await (const key of kv.scanIterator({ match: 'embedding:*' })) {
      keys.push(key);
    }

    if (keys.length === 0) {
      return NextResponse.json({});
    }

    const embeddingsObject: { [key: string]: number[] } = {};
    const chunkSize = 500;

    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunkKeys = keys.slice(i, i + chunkSize);
      const chunkEmbeddings = await kv.mget<number[][]>(...chunkKeys);

      chunkKeys.forEach((key, index) => {
        const roundId = key.replace('embedding:', '');
        if (chunkEmbeddings[index]) {
          embeddingsObject[roundId] = chunkEmbeddings[index];
        }
      });
    }
    
    return NextResponse.json(embeddingsObject);
  } catch (error) {
    console.error('Failed to fetch embeddings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
