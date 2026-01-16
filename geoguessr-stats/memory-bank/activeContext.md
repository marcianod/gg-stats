# GeoGuessr Stats Dashboard - Active Context

## Current Focus

Awaiting next task. The previous focus was on debugging and fixing the userscript's sync functionality.

## Completed Problem Details

-   **Userscript Sync Failures:** The userscript was failing due to a combination of GeoGuessr API changes and aggressive request patterns.
-   **Symptoms:**
    -   Rate-limiting errors (HTTP 429).
    -   An infinite loop causing the script to repeatedly fetch the first page of the activity feed.
    -   Slow performance due to inefficient fetching of duel details.
-   **Solution:**
    -   **Switched to Token-Based Pagination:** Refactored the script to use the new `paginationToken` provided by the GeoGuessr API, fixing the infinite loop.
    -   **Implemented Batched Parallel Requests:** Optimized the fetching of duel details to use small, parallel batches with a delay, balancing speed and reliability.
    -   **Added Exponential Backoff:** Implemented a retry mechanism to gracefully handle any future rate-limiting errors.
    -   **Enhanced Logging:** Improved the sync summary to provide a detailed, collapsible log of which rounds were processed or skipped, and why.

## Next Steps

-   Ready for the next feature implementation or bug fix.
