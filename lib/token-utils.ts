/**
 * Token counting utilities for skill content
 * Provides estimates for Claude token usage
 */

/**
 * Estimate token count for text content
 * Uses the ~4 characters per token heuristic for English text
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // ~4 characters per token is a reasonable approximation for English
  return Math.ceil(text.length / 4);
}

/**
 * Categorize token count into size buckets
 * - metadata: Very small, mostly config (<=100 tokens)
 * - compact: Medium-sized, focused content (<=5000 tokens)
 * - full: Large, comprehensive content (>5000 tokens)
 */
export function getTokenCategory(count: number): "metadata" | "compact" | "full" {
  if (count <= 100) return "metadata";
  if (count <= 5000) return "compact";
  return "full";
}

/**
 * Format token count for display
 * Shows count with category label
 */
export function formatTokenCount(text: string): string {
  const count = estimateTokenCount(text);
  const category = getTokenCategory(count);
  return `~${count.toLocaleString()} tokens (${category})`;
}

/**
 * Calculate total tokens for a skill artifact
 */
export function calculateSkillTokens(artifact: {
  skillMd?: string;
  scripts?: Array<{ content: string }>;
  references?: Array<{ content: string }>;
}): number {
  let total = 0;

  if (artifact.skillMd) {
    total += estimateTokenCount(artifact.skillMd);
  }

  if (artifact.scripts) {
    for (const script of artifact.scripts) {
      total += estimateTokenCount(script.content);
    }
  }

  if (artifact.references) {
    for (const ref of artifact.references) {
      total += estimateTokenCount(ref.content);
    }
  }

  return total;
}
