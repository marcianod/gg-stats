import fs from 'fs/promises';
import path from 'path';
import { Duel } from '../lib/types';
import dotenv from 'dotenv';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
// Make sure to create a .env.local file with your API keys
// GOOGLE_STREET_VIEW_API_KEY=your_google_api_key
// VERTEX_AI_PROJECT_ID=your_gcp_project_id

const GOOGLE_API_KEY = process.env.GOOGLE_STREET_VIEW_API_KEY;
const VERTEX_PROJECT_ID = process.env.VERTEX_AI_PROJECT_ID;

const EMBEDDINGS_FILE_PATH = path.join(process.cwd(), 'public/data/round_embeddings.json');
const IMAGES_DIR_PATH = path.join(process.cwd(), 'public/data/round_images');

interface RoundEmbedding {
  [roundId: string]: number[];
}

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
  console.log(`Fetching image for lat: ${lat}, lng: ${lng}`);
  if (!GOOGLE_API_KEY) {
    throw new Error("Google Street View API key is missing.");
  }
  const fov = getFov(zoom);
  const url = `https://maps.googleapis.com/maps/api/streetview?size=640x640&location=${lat},${lng}&fov=${fov}&heading=${heading}&pitch=${pitch}&key=${GOOGLE_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch Street View image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

const clientOptions = {
  apiEndpoint: 'us-central1-aiplatform.googleapis.com',
};

const predictionServiceClient = new PredictionServiceClient(clientOptions);

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  console.log('Generating embedding for image...');
  if (!VERTEX_PROJECT_ID) {
    throw new Error("Vertex AI Project ID is missing from .env.local");
  }

  const endpoint = `projects/${VERTEX_PROJECT_ID}/locations/us-central1/publishers/google/models/multimodalembedding@001`;

  const instance = {
    image: {
      bytesBase64Encoded: imageBuffer.toString('base64'),
    },
  };

  const instanceValue = helpers.toValue(instance);
  const instances = [instanceValue!];

  const request = {
    endpoint,
    instances,
  };

  const [response] = await predictionServiceClient.predict(request);
  
  if (!response.predictions || response.predictions.length === 0) {
    throw new Error('Failed to get a prediction from the Vertex AI API.');
  }

  const prediction = response.predictions[0] as any;

  if (!prediction || !prediction.structValue || !prediction.structValue.fields || !prediction.structValue.fields.imageEmbedding) {
    throw new Error('API response did not contain a valid image embedding.');
  }

  // The embedding is returned as an array of Value objects, so we need to extract the numberValue from each.
  return prediction.structValue.fields.imageEmbedding.listValue.values.map((v: any) => v.numberValue);
}

async function main() {
  console.log('Starting embedding generation process...');

  try {
    // Ensure images directory exists
    await fs.mkdir(IMAGES_DIR_PATH, { recursive: true });

    // Load existing embeddings
    let existingEmbeddings: RoundEmbedding = {};
    try {
      const fileContent = await fs.readFile(EMBEDDINGS_FILE_PATH, 'utf-8');
      existingEmbeddings = JSON.parse(fileContent);
      console.log(`Loaded ${Object.keys(existingEmbeddings).length} existing embeddings.`);
    } catch (error) {
      console.log('No existing embeddings file found. Starting fresh.');
    }

    console.log('Fetching duel data from API...');
    const duelsResponse = await fetch('http://localhost:3000/api/duels');
    if (!duelsResponse.ok) {
      throw new Error(`Failed to fetch duels: ${duelsResponse.statusText}`);
    }
    const duels: Duel[] = await duelsResponse.json();
    console.log(`Fetched ${duels.length} duels.`);

    const newEmbeddings: RoundEmbedding = {};
    let roundsProcessed = 0;

    for (const duel of duels) {
      if (duel.rounds && duel.rounds.length > 0) {
        for (let i = 0; i < duel.rounds.length; i++) {
          const round = duel.rounds[i] as any;
          const roundId = `${duel.gameId}_${i + 1}`;

          // Skip if embedding already exists
          if (existingEmbeddings[roundId]) {
            continue;
          }
          
          // Add a check to ensure the necessary data exists before processing.
          if (!round.panorama || typeof round.panorama.heading === 'undefined' || typeof round.panorama.lat === 'undefined' || typeof round.panorama.lng === 'undefined') {
            console.warn(`Skipping round ${roundId} due to missing panorama data.`);
            continue; // Skip to the next round
          }

          console.log(`Processing new round: ${roundId}`);

          try {
            const imagePath = path.join(IMAGES_DIR_PATH, `${roundId}.jpg`);
            let imageBuffer: Buffer;

            try {
              imageBuffer = await fs.readFile(imagePath);
              console.log(`Loaded image for round ${roundId} from local cache.`);
            } catch (error) {
              imageBuffer = await fetchStreetViewImage(
                round.panorama.lat,
                round.panorama.lng,
                round.panorama.heading,
                round.panorama.pitch ?? 0,
                round.panorama.zoom ?? 0
              );
              await fs.writeFile(imagePath, imageBuffer);
              console.log(`Saved image for round ${roundId} to local cache.`);
            }

            const embedding = await generateEmbedding(imageBuffer);
            newEmbeddings[roundId] = embedding;
            roundsProcessed++;
          } catch (error) {
            console.error(`Skipping round ${roundId} due to an error:`, error);
          }
        }
      }
    }

    if (roundsProcessed > 0) {
      const allEmbeddings = { ...existingEmbeddings, ...newEmbeddings };
      await fs.writeFile(EMBEDDINGS_FILE_PATH, JSON.stringify(allEmbeddings, null, 2));
      console.log(`Successfully generated and saved embeddings for ${roundsProcessed} new rounds. Total embeddings: ${Object.keys(allEmbeddings).length}.`);
    } else {
      console.log('No new rounds to process. Embeddings are up to date.');
    }

  } catch (error) {
    console.error('An error occurred during embedding generation:', error);
  }
}

main();
