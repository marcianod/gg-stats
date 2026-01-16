import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

console.log('Loaded keys from .env.local:');
const keys = [
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'KV_URL',
    'gg2_KV_REST_API_URL',
    'gg2_KV_REST_API_TOKEN',
    'MONGODB_URI'
];

keys.forEach(k => {
    console.log(`${k}: ${process.env[k] ? 'EXISTS' : 'MISSING'}`);
});
