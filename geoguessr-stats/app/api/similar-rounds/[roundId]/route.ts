import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'gg-vector-db-collection';

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable must be set.");
}

// Cache the MongoDB client connection
let cachedClient: MongoClient | null = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  cachedClient = client;
  return client;
}

interface EmbeddingDocument {
    _id: string;
    embedding: number[];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ roundId: string }> }
) {
  try {
    const { roundId } = await context.params;
    if (!roundId) {
      return new NextResponse('Round ID is required', { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const thresholdParam = searchParams.get('threshold');
    const similarityThreshold = thresholdParam ? parseFloat(thresholdParam) : 0.85;

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection<EmbeddingDocument>(COLLECTION_NAME);

    // 1. Get the vector for the target round
    const targetDocument = await collection.findOne({ _id: roundId });
    if (!targetDocument) {
      return new NextResponse('Target round not found', { status: 404 });
    }
    const targetVector = targetDocument.embedding;

    // 2. Perform the vector search
    const pipeline = [
      {
        '$vectorSearch': {
          'index': 'gg_vector_index',
          'path': 'embedding',
          'queryVector': targetVector,
          'numCandidates': 100,
          'limit': 11 // Fetch 11 to exclude the target document itself
        }
      },
      {
        '$project': {
          '_id': 1,
          'score': { '$meta': 'vectorSearchScore' }
        }
      }
    ];

    const results = await collection.aggregate(pipeline).toArray();

    // 3. Filter out the target round itself and any results below the threshold
    const similarRounds = results
      .filter(doc => doc._id !== roundId && doc.score >= similarityThreshold)
      .slice(0, 10); // Ensure we only return a maximum of 10

    return NextResponse.json(similarRounds.map(doc => doc._id));

  } catch (error) {
    console.error('[Similar Rounds API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
