// lib/similarity.ts

/**
 * Calculates the dot product of two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The dot product.
 */
function dotProduct(vecA: number[], vecB: number[]): number {
  return vecA.map((val, i) => val * vecB[i]).reduce((acc, val) => acc + val, 0);
}

/**
 * Calculates the magnitude (or L2 norm) of a vector.
 * @param vec - The vector.
 * @returns The magnitude of the vector.
 */
function magnitude(vec: number[]): number {
  return Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA - The first vector.
 * @param vecB - The second vector.
 * @returns The cosine similarity, a value between -1 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dotProduct(vecA, vecB) / (magA * magB);
}

/**
 * Finds the top N most similar rounds to a target round based on embeddings.
 * @param targetRoundId - The ID of the round to find similarities for.
 * @param allEmbeddings - A map of all round IDs to their embedding vectors.
 * @param count - The number of similar rounds to return.
 * @returns An array of the top N most similar round IDs, sorted by similarity.
 */
export function findSimilarRounds(
  targetRoundId: string,
  allEmbeddings: { [roundId: string]: number[] },
  count: number = 10
): string[] {
  const targetEmbedding = allEmbeddings[targetRoundId];

  if (!targetEmbedding) {
    return [];
  }

  const similarities: { roundId: string; score: number }[] = [];

  for (const roundId in allEmbeddings) {
    if (roundId !== targetRoundId) {
      const currentEmbedding = allEmbeddings[roundId];
      const score = cosineSimilarity(targetEmbedding, currentEmbedding);
      similarities.push({ roundId, score });
    }
  }

  // Sort by similarity score in descending order
  similarities.sort((a, b) => b.score - a.score);

  // Return the top N round IDs
  return similarities.slice(0, count).map(sim => sim.roundId);
}
