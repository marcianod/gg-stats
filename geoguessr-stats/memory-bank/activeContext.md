# GeoGuessr Stats Dashboard - Active Context

## Current Focus

The primary focus is on resolving a data sorting issue within the main dashboard. After migrating to a Vercel KV database, the duel data fetched from the `/api/duels` endpoint is in an arbitrary order. This causes the UI to display matches incorrectly, not chronologically as intended.

## Problem Details

- **Issue:** The "Recent Matches" table does not show the newest games first.
- **Root Cause:** The Upstash database (Vercel KV) does not guarantee the order of items returned from `keys()` and `mget()`.
- **Attempted Fixes:**
    1.  An initial client-side sort was added, but it was being overridden by another sort operation.
    2.  A second attempt was made to correct the sorting logic using a more reliable timestamp (`guesses[0].created`), but this also failed to produce the correct order.

## Next Steps

- **Diagnose:** Investigate why the latest sorting logic is not working as expected. This may involve logging the data at various stages of the processing pipeline to see how it's being transformed.
- **Implement a Robust Solution:** Develop a reliable client-side sorting mechanism that correctly orders the duels from newest to oldest before they are rendered.
