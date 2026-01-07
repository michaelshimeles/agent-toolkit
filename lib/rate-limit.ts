/**
 * Simple in-memory rate limiter
 * For production, use Redis or a dedicated rate limiting service
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(config: RateLimitConfig) {
  return async (identifier: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> => {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      const resetTime = now + config.windowMs;
      rateLimitStore.set(identifier, {
        count: 1,
        resetTime,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime,
      };
    }

    // Increment existing entry
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    entry.count++;
    rateLimitStore.set(identifier, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  };
}

// Pre-configured rate limiters
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
});

export const toolCallRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 tool calls per minute
});
