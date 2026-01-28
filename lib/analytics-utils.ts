import { createHash } from "crypto";

/**
 * Anonymize parameter values to types only.
 * Never stores actual values, only the structure.
 * Example: {name: "John", age: 25} becomes {name: "string", age: "number"}
 */
export function anonymizeParams(params: unknown): unknown {
  if (params === null) return "null";
  if (params === undefined) return "undefined";

  const type = typeof params;

  if (type === "string") return "string";
  if (type === "number") return "number";
  if (type === "boolean") return "boolean";

  if (Array.isArray(params)) {
    if (params.length === 0) return "array<empty>";
    // Anonymize first element to represent array type
    return `array<${JSON.stringify(anonymizeParams(params[0]))}>`;
  }

  if (type === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
      result[key] = anonymizeParams(value);
    }
    return result;
  }

  return "unknown";
}

/**
 * Calculate parameter complexity metrics.
 */
export function getParamComplexity(params: unknown): {
  depth: number;
  count: number;
  maxArrayLength: number;
} {
  let maxDepth = 0;
  let totalCount = 0;
  let maxArrayLength = 0;

  function traverse(value: unknown, currentDepth: number): void {
    if (currentDepth > maxDepth) {
      maxDepth = currentDepth;
    }

    if (value === null || value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > maxArrayLength) {
        maxArrayLength = value.length;
      }
      for (const item of value) {
        traverse(item, currentDepth + 1);
      }
      return;
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      totalCount += entries.length;
      for (const [, v] of entries) {
        traverse(v, currentDepth + 1);
      }
    }
  }

  traverse(params, 0);

  return {
    depth: maxDepth,
    count: totalCount,
    maxArrayLength,
  };
}

/**
 * Estimate token count from string or object.
 * Uses a simple heuristic: ~4 characters per token for English text.
 */
export function estimateTokens(data: unknown): number {
  if (data === null || data === undefined) return 0;

  let text: string;
  if (typeof data === "string") {
    text = data;
  } else {
    try {
      text = JSON.stringify(data);
    } catch {
      return 0;
    }
  }

  // Rough estimate: 4 characters per token on average
  return Math.ceil(text.length / 4);
}

/**
 * Generate a session hash that is not tied to any user.
 * Uses request headers to create a temporary session identifier.
 */
export function generateSessionHash(headers: Headers): string {
  // Use a combination of non-identifying headers to create a session
  const components = [
    headers.get("x-request-id") || "",
    headers.get("x-correlation-id") || "",
    // Add timestamp-based component for uniqueness
    Math.floor(Date.now() / (1000 * 60 * 5)).toString(), // 5-minute buckets
    // Random component for sessions without identifiers
    Math.random().toString(36).substring(2, 10),
  ].join("|");

  return createHash("sha256").update(components).digest("hex").substring(0, 32);
}

/**
 * Categorize errors into broad, non-identifying categories.
 */
export function categorizeError(error: unknown): string {
  if (!error) return "unknown";

  const errorString =
    error instanceof Error ? error.message : String(error);
  const lowerError = errorString.toLowerCase();

  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "timeout";
  }
  if (
    lowerError.includes("rate limit") ||
    lowerError.includes("too many requests") ||
    lowerError.includes("429")
  ) {
    return "rate_limit";
  }
  if (
    lowerError.includes("unauthorized") ||
    lowerError.includes("forbidden") ||
    lowerError.includes("401") ||
    lowerError.includes("403")
  ) {
    return "auth";
  }
  if (
    lowerError.includes("validation") ||
    lowerError.includes("invalid") ||
    lowerError.includes("required")
  ) {
    return "validation";
  }
  if (
    lowerError.includes("not found") ||
    lowerError.includes("404")
  ) {
    return "not_found";
  }
  if (
    lowerError.includes("network") ||
    lowerError.includes("connection") ||
    lowerError.includes("econnrefused")
  ) {
    return "network";
  }
  if (lowerError.includes("upstream") || lowerError.includes("502") || lowerError.includes("503")) {
    return "upstream";
  }

  return "unknown";
}

/**
 * Known AI model patterns for extraction from headers/user-agent.
 */
const MODEL_PATTERNS: Array<{ pattern: RegExp; model: string }> = [
  { pattern: /claude-3-opus/i, model: "claude-3-opus" },
  { pattern: /claude-3\.5-sonnet/i, model: "claude-3.5-sonnet" },
  { pattern: /claude-3-sonnet/i, model: "claude-3-sonnet" },
  { pattern: /claude-3-haiku/i, model: "claude-3-haiku" },
  { pattern: /claude-2/i, model: "claude-2" },
  { pattern: /gpt-4o/i, model: "gpt-4o" },
  { pattern: /gpt-4-turbo/i, model: "gpt-4-turbo" },
  { pattern: /gpt-4/i, model: "gpt-4" },
  { pattern: /gpt-3\.5/i, model: "gpt-3.5-turbo" },
  { pattern: /gemini-pro/i, model: "gemini-pro" },
  { pattern: /gemini-ultra/i, model: "gemini-ultra" },
];

/**
 * Extract model ID from request headers or metadata.
 */
export function extractModelId(headers: Headers): string | null {
  // Check explicit model headers
  const modelHeader =
    headers.get("x-model-id") ||
    headers.get("x-ai-model") ||
    headers.get("x-llm-model");

  if (modelHeader) {
    return modelHeader;
  }

  // Check User-Agent for model hints
  const userAgent = headers.get("user-agent") || "";
  for (const { pattern, model } of MODEL_PATTERNS) {
    if (pattern.test(userAgent)) {
      return model;
    }
  }

  return null;
}

/**
 * Known client patterns for identification.
 */
const CLIENT_PATTERNS: Array<{ pattern: RegExp; client: string }> = [
  { pattern: /cursor/i, client: "cursor" },
  { pattern: /claude-desktop/i, client: "claude-desktop" },
  { pattern: /claude-code/i, client: "claude-code" },
  { pattern: /vscode/i, client: "vscode" },
  { pattern: /continue/i, client: "continue" },
  { pattern: /cody/i, client: "cody" },
  { pattern: /copilot/i, client: "copilot" },
  { pattern: /openai-python/i, client: "openai-python" },
  { pattern: /anthropic-python/i, client: "anthropic-python" },
  { pattern: /langchain/i, client: "langchain" },
];

/**
 * Extract client ID from User-Agent or custom headers.
 */
export function extractClientId(headers: Headers): string {
  // Check explicit client headers
  const clientHeader =
    headers.get("x-client-id") ||
    headers.get("x-mcp-client");

  if (clientHeader) {
    return clientHeader;
  }

  // Check User-Agent for known clients
  const userAgent = headers.get("user-agent") || "";
  for (const { pattern, client } of CLIENT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return client;
    }
  }

  return "unknown";
}

/**
 * Extract geo region from CDN headers or IP.
 * Only returns country code, never precise location.
 */
export function getGeoRegion(headers: Headers): string | null {
  // Cloudflare
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") {
    return cfCountry;
  }

  // Vercel
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return vercelCountry;
  }

  // AWS CloudFront
  const cloudfrontCountry = headers.get("cloudfront-viewer-country");
  if (cloudfrontCountry) {
    return cloudfrontCountry;
  }

  // Fastly
  const fastlyCountry = headers.get("fastly-client-geo-country");
  if (fastlyCountry) {
    return fastlyCountry;
  }

  return null;
}

/**
 * In-memory session state for retry detection.
 * Maps sessionHash -> { toolName -> lastCallTimestamp }
 */
const sessionCallHistory = new Map<string, Map<string, { timestamp: number; failed: boolean }>>();

// Clean up old sessions periodically (older than 10 minutes)
const SESSION_TTL_MS = 10 * 60 * 1000;

function cleanupOldSessions(): void {
  const now = Date.now();
  for (const [sessionHash, tools] of sessionCallHistory) {
    for (const [toolName, data] of tools) {
      if (now - data.timestamp > SESSION_TTL_MS) {
        tools.delete(toolName);
      }
    }
    if (tools.size === 0) {
      sessionCallHistory.delete(sessionHash);
    }
  }
}

/**
 * Detect if this is a retry based on session history.
 * A retry is defined as calling the same tool within 5 seconds of a failure.
 */
export function detectRetry(
  sessionHash: string,
  toolName: string,
  previousFailed: boolean = false
): { isRetry: boolean; retryCount: number } {
  cleanupOldSessions();

  const now = Date.now();
  let sessionTools = sessionCallHistory.get(sessionHash);

  if (!sessionTools) {
    sessionTools = new Map();
    sessionCallHistory.set(sessionHash, sessionTools);
  }

  const lastCall = sessionTools.get(toolName);
  let isRetry = false;
  let retryCount = 0;

  if (lastCall) {
    // If the last call to this tool failed and this call is within 5 seconds
    const timeSinceLastCall = now - lastCall.timestamp;
    if (lastCall.failed && timeSinceLastCall < 5000) {
      isRetry = true;
      // Increment retry count (stored in a simplified way)
      retryCount = 1;
    }
  }

  // Update the history with this call
  sessionTools.set(toolName, { timestamp: now, failed: previousFailed });

  return { isRetry, retryCount };
}

/**
 * In-memory tracking for parallel call detection.
 * Maps sessionHash -> recent call timestamps
 */
const recentCallTimestamps = new Map<string, number[]>();

/**
 * Detect execution mode (parallel vs sequential).
 * Parallel is detected when multiple calls happen within 100ms.
 */
export function detectExecutionMode(
  sessionHash: string,
  timestamp: number
): { mode: "parallel" | "sequential"; batchId: string | null; batchSize: number } {
  const PARALLEL_THRESHOLD_MS = 100;

  let timestamps = recentCallTimestamps.get(sessionHash) || [];

  // Remove old timestamps (older than 1 second)
  timestamps = timestamps.filter((t) => timestamp - t < 1000);

  // Check if any recent calls are within the parallel threshold
  const parallelCalls = timestamps.filter(
    (t) => Math.abs(timestamp - t) < PARALLEL_THRESHOLD_MS
  );

  timestamps.push(timestamp);
  recentCallTimestamps.set(sessionHash, timestamps);

  if (parallelCalls.length > 0) {
    // This is a parallel call
    const batchTimestamp = Math.min(...parallelCalls, timestamp);
    const batchId = createHash("sha256")
      .update(`${sessionHash}-${batchTimestamp}`)
      .digest("hex")
      .substring(0, 16);

    return {
      mode: "parallel",
      batchId,
      batchSize: parallelCalls.length + 1,
    };
  }

  return {
    mode: "sequential",
    batchId: null,
    batchSize: 1,
  };
}

/**
 * Get the current session call index (position in sequence).
 */
const sessionCallCounts = new Map<string, number>();

export function getSessionCallIndex(sessionHash: string): number {
  const current = sessionCallCounts.get(sessionHash) || 0;
  const next = current + 1;
  sessionCallCounts.set(sessionHash, next);
  return next;
}

/**
 * Reset session tracking (for testing or cleanup).
 */
export function resetSessionTracking(): void {
  sessionCallHistory.clear();
  recentCallTimestamps.clear();
  sessionCallCounts.clear();
}
