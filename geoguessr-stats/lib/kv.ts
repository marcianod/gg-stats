import { createClient } from '@vercel/kv';

// Priority:
// 1. gg2_ prefix (New DB injected by Vercel)
// 2. KV_REST_API_ prefix (Standard Vercel KV)
// 3. Fallback (for local dev or explicit overrides)

const url = process.env.gg2_KV_REST_API_URL || process.env.KV_REST_API_URL || process.env.KV_URL;
const token = process.env.gg2_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;

if (!url || !token) {
    throw new Error(
        'Missing Vercel KV environment variables. ' +
        'Please ensure gg2_KV_REST_API_URL/TOKEN or KV_REST_API_URL/TOKEN are set.'
    );
}

export const kv = createClient({
    url,
    token,
});
