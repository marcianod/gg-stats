# Optimization Plan: Embedding Regeneration Script

## Goal
Optimize `scripts/regenerate_missing_embeddings.ts` to reduce execution time by minimizing database round-trips.

## Proposed Changes

### Scripts
#### [MODIFY] [regenerate_missing_embeddings.ts](file:///c:/Users/marci/Documents/GeoGuessr%20Stats/geoguessr-stats/scripts/regenerate_missing_embeddings.ts)
- **Batch Fetching**: Instead of calling `collection.findOne` for every round (8000+ calls), fetch all existing `_id`s from MongoDB at the start (1 call).
- **In-Memory Check**: Store existing IDs in a `Set<string>` and check against this set in the loop.
- **Performance Impact**: This will reduce the "checking" phase from minutes to seconds.

## Verification Plan

### Automated Verification
- Run the script in `DRY_RUN = true` mode.
- Verify it completes the "checking" phase almost instantly.
- Verify it still correctly identifies the ~1290 missing rounds.

### Manual Verification
- Once verified in dry run, the user can execute the script in live mode.
