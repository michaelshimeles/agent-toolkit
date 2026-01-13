/**
 * API Utilities
 * Common utilities for API operations, fetch with timeout, slug generation, etc.
 */

/**
 * Fetch with timeout - wraps fetch with AbortSignal timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default 30000)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate URL-safe slug from name
 * @param name - Name to convert to slug
 * @returns URL-safe slug
 */
export function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Ensure slug is not empty
  if (!slug) {
    return `server-${Date.now()}`;
  }

  return slug;
}

/**
 * Validate URL format
 * @param url - URL to validate
 * @returns true if valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse GitHub URL and extract owner/repo
 * @param url - GitHub URL
 * @returns { owner, repo } or null if invalid
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    return null;
  }

  const [, owner, repo] = match;
  return {
    owner,
    repo: repo.replace(/\.git$/, ""),
  };
}

/**
 * Retry fetch with exponential backoff
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum number of retries (default 3)
 * @param baseDelayMs - Base delay in milliseconds (default 1000)
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Retry on rate limit (429) or server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = baseDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get GitHub API headers with optional authentication
 */
export function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "MCP-Hub-Builder",
  };

  // Use GitHub token if available for higher rate limits
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  return headers;
}
