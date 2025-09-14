Plan: Migrating from JSON File to a Cloud Database

This plan outlines the steps to transition the GeoGuessr Stats Dashboard from using a local geoguessr_stats.json file to a dynamic, cloud-based database solution hosted on Vercel. This will enable real-time data synchronization.

We will use Vercel KV, a simple and fast key-value database that is perfect for this use case.
Phase 1: Server-Side Setup (Vercel API)

The goal here is to create the backend infrastructure to receive and store the duel data.
1. Set up Vercel KV Database

    In your Vercel project dashboard, create a new Vercel KV store.

    Connect it to your project. This will automatically add the necessary environment variables (KV_URL, KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN) to your project.

2. Create the Sync API Endpoint (/api/sync)

This is the endpoint the userscript will send new duel data to.

    Create a new file: app/api/sync/route.ts.

    Logic:

        It will accept POST requests containing an array of new duel JSON objects.

        For each duel, it will use the duel.id as the key.

        It will use the Vercel KV mset command to efficiently save all new duels in a single operation.

        It will store a separate key, lastSyncTimestamp, to keep track of the last successful sync.

        It will return a success message with the count of added duels.

3. Create the Data Fetching API Endpoint (/api/duels)

This is the endpoint your Next.js frontend will use to get all the duel data, replacing the direct read of geoguessr_stats.json.

    Create a new file: app/api/duels/route.ts.

    Logic:

        It will accept GET requests.

        It will use the Vercel KV scan command to get all keys (except lastSyncTimestamp).

        It will then use the mget command to retrieve all duel objects for those keys.

        It will return the complete array of duel data.

4. Create the Timestamp API Endpoint (/api/last-sync)

This is a helper endpoint for the userscript to know which games are new.

    Create a new file: app/api/last-sync/route.ts.

    Logic:

        It will accept GET requests.

        It will read the lastSyncTimestamp value from Vercel KV.

        It will return the timestamp as JSON.

Phase 2: Client-Side Refactor (Next.js Project)

The goal here is to adapt the frontend to fetch data from the new API endpoints instead of the static JSON file.
1. Modify Data Fetching Hook

    Locate the useEffect hook in your main dashboard component (app/page.tsx or similar) that currently fetches /geoguessr_stats.json.

    Change the fetch URL from /geoguessr_stats.json to /api/duels.

    The rest of your client-side logic (useMemo hooks for processing, etc.) should remain largely unchanged, as it will still receive the same array of duel data, just from a different source.

2. Remove Static JSON File

    Once the application is successfully fetching from /api/duels, you can safely delete the public/geoguessr_stats.json file from your project.

Phase 3: Userscript Update

The goal here is to make the userscript communicate with the new Vercel API.
1. Update Endpoint URL

    Change the webAppUrl variable in the userscript to your production Vercel URL: https://your-app-name.vercel.app/api/sync.

2. Implement "Smart Sync" Logic

    Before fetching the activity feed from GeoGuessr, the script will first make a GET request to https://your-app-name.vercel.app/api/last-sync.

    It will use the returned timestamp to fetch only games newer than that date, significantly speeding up the sync process.

    The logic for handling a "Force Full Resync" will remain, simply telling the script to ignore the timestamp and start from scratch.