import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'gg-vector-db';
const OLD_NAME = 'gg-vector-db-collection';
const NEW_NAME = 'embeddings';

async function main() {
    console.log(`Renaming collection ${OLD_NAME} -> ${NEW_NAME}...`);

    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI missing');
    }

    const client = new MongoClient(MONGODB_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);

        const collections = await db.listCollections({ name: OLD_NAME }).toArray();
        if (collections.length === 0) {
            console.log(`Collection '${OLD_NAME}' not found. checking if '${NEW_NAME}' exists...`);
            const newCols = await db.listCollections({ name: NEW_NAME }).toArray();
            if (newCols.length > 0) {
                console.log(`Collection '${NEW_NAME}' already exists. Migration likely already done.`);
                return;
            }
            console.error('Neither collection found. Aborting.');
            return;
        }

        await db.renameCollection(OLD_NAME, NEW_NAME);
        console.log('✅ Collection renamed successfully.');

    } catch (e) {
        console.error('Error renaming:', e);
    } finally {
        await client.close();
    }
}

main();
