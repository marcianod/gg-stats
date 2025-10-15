import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { connectToDatabase } from '@/lib/mongodb';
import { Duel, Round } from '@/lib/types';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';

// --- Configuration ---
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const VERTEX_PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID;
const DB_NAME = 'gg-vector-db';
const COLLECTION_NAME = 'gg-vector-db-collection';
// --- Type Definitions ---
interface EmbeddingDocument {
    _id: string;
    embedding: number[];
}

// --- Google Cloud AI Platform Client ---
const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};
const predictionServiceClient = new PredictionServiceClient(clientOptions);

// --- Helper Functions ---
function getFov(zoom: number | undefined): number {
  if (zoom === undefined) return 90;
  switch (Math.round(zoom)) {
    case 1: return 60;
    case 2: return 40;
    case 3: return 20;
    default: return 90;
  }
}

async function fetchStreetViewImage(lat: number, lng: number, heading: number, pitch: number, zoom: number): Promise<Buffer> {
  if (!GOOGLE_API_KEY) throw new Error("Google Street View API key is missing.");
  const fov = getFov(zoom);
  const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch Street View image: ${response.statusText}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  if (!VERTEX_PROJECT_ID) throw new Error("Vertex AI Project ID is missing.");
  const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/multimodalembedding@001`;
  const instance = { image: { bytesBase64Encoded: imageBuffer.toString('base64') } };
  const instanceValue = helpers.toValue(instance);
  const instances = [instanceValue!];
  const request = { endpoint, instances };
  const [response] = await predictionServiceClient.predict(request);
  if (!response.predictions || response.predictions.length === 0) throw new Error('Failed to get a prediction from the Vertex AI API.');
  const predictionValue = response.predictions[0];
  if (!predictionValue.structValue?.fields?.imageEmbedding?.listValue?.values) throw new Error('API response did not contain a valid image embedding structure.');
  const embeddingList = predictionValue.structValue.fields.imageEmbedding.listValue.values;
  const imageEmbedding = embeddingList.map(v => v.numberValue).filter((n): n is number => n !== null && n !== undefined);
  if (imageEmbedding.length === 0) throw new Error('API response did not contain a valid image embedding.');
  return imageEmbedding;
}

// --- CORS Headers ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://www.geoguessr.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// --- API Route Handler ---
export async function POST(request: Request) {
  try {
    const { roundId } = await request.json();

    if (!roundId || typeof roundId !== 'string') {
      return NextResponse.json({ error: 'Invalid request body, expected a roundId.' }, { status: 400, headers: CORS_HEADERS });
    }

    console.log(`[Process-Round] Processing round: ${roundId}`);

    const client = await connectToDatabase();
    const db = client.db(DB_NAME);
    const collection = db.collection<EmbeddingDocument>(COLLECTION_NAME);

    const existingDoc = await collection.findOne({ _id: roundId });
    if (existingDoc) {
      console.log(`[Process-Round] Embedding for ${roundId} already exists. Skipping.`);
      return NextResponse.json({ status: 'success', message: `Skipped ${roundId}, already exists.` }, { headers: CORS_HEADERS });
    }

    const [gameId, roundIndexStr] = roundId.split('_');
    const roundIndex = parseInt(roundIndexStr, 10) - 1;

    const duel = await kv.get<Duel>(gameId);
    if (!duel || !duel.rounds || !duel.rounds[roundIndex]) {
      throw new Error(`Could not find duel data for round ${roundId}`);
    }

    const round = duel.rounds[roundIndex] as Round;

    if (!round.panorama || typeof round.panorama.heading === 'undefined' || typeof round.panorama.lat === 'undefined' || typeof round.panorama.lng === 'undefined') {
      console.warn(`[Process-Round] Skipping round ${roundId} due to missing panorama data.`);
      return NextResponse.json({ status: 'success', message: `Skipped ${roundId}, missing data.` }, { headers: CORS_HEADERS });
    }

    const imageBuffer = await fetchStreetViewImage(round.panorama.lat, round.panorama.lng, round.panorama.heading, round.panorama.pitch ?? 0, round.panorama.zoom ?? 0);
    const embedding = await generateEmbedding(imageBuffer);
    await collection.insertOne({ _id: roundId, embedding: embedding });

    console.log(`[Process-Round] Successfully processed and saved embedding for ${roundId}.`);
    return NextResponse.json({ status: 'success', processed: roundId }, { headers: CORS_HEADERS });

  } catch (error) {
    console.error('[Process-Round] A critical error occurred:', error);
    return NextResponse.json({ error: 'Failed to process round.' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
