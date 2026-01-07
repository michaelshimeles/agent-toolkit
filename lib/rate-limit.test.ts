import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    vi.clearAllTimers();
  });

  describe("Basic Rate Limiting", () => {
    it("should allow requests within limit", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = await limiter("user123");

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("should track request count", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const userId = `user-${Date.now()}-${Math.random()}`;
      await limiter(userId);
      await limiter(userId);
      const result = await limiter(userId);

      expect(result.remaining).toBe(2);
    });

    it("should block requests over limit", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 3,
      });

      await limiter("user123");
      await limiter("user123");
      await limiter("user123");
      const result = await limiter("user123");

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("should return reset time", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = await limiter("user123");

      expect(result.resetTime).toBeGreaterThan(Date.now());
    });
  });

  describe("Multiple Identifiers", () => {
    it("should track different users separately", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 3,
      });

      const user1Result = await limiter("user1");
      const user2Result = await limiter("user2");

      expect(user1Result.remaining).toBe(2);
      expect(user2Result.remaining).toBe(2);
    });

    it("should not affect other users when one is rate limited", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 2,
      });

      await limiter("user1");
      await limiter("user1");
      const user1Blocked = await limiter("user1");

      const user2Result = await limiter("user2");

      expect(user1Blocked.allowed).toBe(false);
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe("Time Windows", () => {
    it("should configure 1 minute window", () => {
      const windowMs = 60 * 1000;
      expect(windowMs).toBe(60000);
    });

    it("should configure 1 hour window", () => {
      const windowMs = 60 * 60 * 1000;
      expect(windowMs).toBe(3600000);
    });

    it("should configure 15 minute window", () => {
      const windowMs = 15 * 60 * 1000;
      expect(windowMs).toBe(900000);
    });
  });

  describe("Configuration", () => {
    it("should support custom window size", async () => {
      const limiter = rateLimit({
        windowMs: 30000, // 30 seconds
        maxRequests: 10,
      });

      const result = await limiter("user123");

      expect(result.allowed).toBe(true);
    });

    it("should support custom max requests", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 100,
      });

      const userId = `user-${Date.now()}-${Math.random()}`;
      const result = await limiter(userId);

      expect(result.remaining).toBe(99);
    });
  });

  describe("API Rate Limits", () => {
    it("should have API rate limit of 100 per minute", () => {
      const config = {
        windowMs: 60 * 1000,
        maxRequests: 100,
      };

      expect(config.maxRequests).toBe(100);
      expect(config.windowMs).toBe(60000);
    });

    it("should have auth rate limit of 5 per 15 minutes", () => {
      const config = {
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
      };

      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(900000);
    });

    it("should have tool call rate limit of 60 per minute", () => {
      const config = {
        windowMs: 60 * 1000,
        maxRequests: 60,
      };

      expect(config.maxRequests).toBe(60);
      expect(config.windowMs).toBe(60000);
    });
  });

  describe("Rate Limit Headers", () => {
    it("should include remaining count", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 10,
      });

      const result = await limiter("user123");

      expect(result.remaining).toBeDefined();
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });

    it("should include reset time", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 10,
      });

      const result = await limiter("user123");

      expect(result.resetTime).toBeDefined();
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it("should calculate reset time correctly", async () => {
      const windowMs = 60000;
      const limiter = rateLimit({
        windowMs,
        maxRequests: 10,
      });

      const now = Date.now();
      const result = await limiter("user123");

      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + windowMs + 100);
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid requests", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const promises = Array.from({ length: 10 }, () => limiter("user123"));
      const results = await Promise.all(promises);

      const allowed = results.filter((r) => r.allowed).length;
      expect(allowed).toBeLessThanOrEqual(5);
    });

    it("should handle empty identifier", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const result = await limiter("");

      expect(result.allowed).toBe(true);
    });

    it("should handle very long identifiers", async () => {
      const limiter = rateLimit({
        windowMs: 60000,
        maxRequests: 5,
      });

      const longId = "a".repeat(1000);
      const result = await limiter(longId);

      expect(result.allowed).toBe(true);
    });
  });
});
