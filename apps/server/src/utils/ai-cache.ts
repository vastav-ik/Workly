import prisma from "./prisma";

/**
 * Semantic Cache for AI responses.
 *
 * Uses lightweight cosine similarity on stored embedding vectors
 * to avoid duplicate Gemini API calls for similar questions.
 */

const SIMILARITY_THRESHOLD = 0.92;

/** Compute cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Simple text-to-vector embedding using character n-gram frequency.
 * Replace with Gemini's `embedding-001` model in production for higher accuracy.
 */
export function simpleEmbed(text: string): number[] {
  const normalised = text.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const tokens = normalised.split(/\s+/).filter(Boolean);
  // Create a bag-of-words vector with a fixed vocabulary via hashing
  const vecSize = 256;
  const vec = new Array(vecSize).fill(0);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash + token.charCodeAt(i)) | 0;
    }
    const idx = ((hash % vecSize) + vecSize) % vecSize;
    vec[idx] += 1;
  }
  // Normalise
  const mag = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0));
  if (mag > 0) for (let i = 0; i < vecSize; i++) vec[i] /= mag;
  return vec;
}

/**
 * Look up cached response by semantic similarity.
 * Returns cached response string if a similar query exists, otherwise null.
 */
export async function findCachedResponse(query: string): Promise<string | null> {
  const queryVec = simpleEmbed(query);
  const entries = await prisma.semanticCache.findMany({
    select: { response: true, vectorJson: true },
  });

  for (const entry of entries) {
    try {
      const storedVec: number[] = JSON.parse(entry.vectorJson);
      const sim = cosineSimilarity(queryVec, storedVec);
      if (sim >= SIMILARITY_THRESHOLD) {
        return entry.response;
      }
    } catch {
      continue; // Skip malformed entries
    }
  }
  return null;
}

/**
 * Store a new query-response pair in the semantic cache.
 */
export async function cacheResponse(query: string, response: string): Promise<void> {
  const vec = simpleEmbed(query);
  await prisma.semanticCache.upsert({
    where: { query },
    create: {
      query,
      response,
      vectorJson: JSON.stringify(vec),
    },
    update: {
      response,
      vectorJson: JSON.stringify(vec),
    },
  });
}
