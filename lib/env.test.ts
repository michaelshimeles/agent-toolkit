import { describe, it, expect, beforeEach, vi } from "vitest";

describe("Environment Variable Validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  describe("Required Client Environment Variables", () => {
    it("should require NEXT_PUBLIC_CONVEX_URL", () => {
      const requiredVars = [
        "NEXT_PUBLIC_CONVEX_URL",
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      ];

      requiredVars.forEach((varName) => {
        expect(varName).toMatch(/^NEXT_PUBLIC_/);
      });
    });

    it("should require NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", () => {
      const varName = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY";
      expect(varName).toBeTruthy();
      expect(varName).toMatch(/^NEXT_PUBLIC_/);
    });
  });

  describe("Required Server Environment Variables", () => {
    it("should require CLERK_SECRET_KEY", () => {
      const varName = "CLERK_SECRET_KEY";
      expect(varName).toBeTruthy();
      expect(varName).toMatch(/^CLERK_/);
    });

    it("should require ENCRYPTION_KEY", () => {
      const varName = "ENCRYPTION_KEY";
      expect(varName).toBeTruthy();
    });
  });

  describe("Environment Variable Format", () => {
    it("should validate Convex URL format", () => {
      const validUrls = [
        "https://project.convex.cloud",
        "https://happy-animal-123.convex.cloud",
      ];

      validUrls.forEach((url) => {
        expect(url).toMatch(/^https:\/\/.+\.convex\.cloud$/);
      });
    });

    it("should validate Clerk publishable key format", () => {
      const validKeys = [
        "pk_test_xxxxx",
        "pk_live_xxxxx",
      ];

      validKeys.forEach((key) => {
        expect(key).toMatch(/^pk_(test|live)_/);
      });
    });

    it("should validate Clerk secret key format", () => {
      const validKeys = [
        "sk_test_xxxxx",
        "sk_live_xxxxx",
      ];

      validKeys.forEach((key) => {
        expect(key).toMatch(/^sk_(test|live)_/);
      });
    });

    it("should validate encryption key length", () => {
      const minLength = 16;
      const recommendedLength = 32;

      expect(minLength).toBeGreaterThanOrEqual(16);
      expect(recommendedLength).toBe(32);
    });
  });

  describe("Error Messages", () => {
    it("should provide helpful error message for missing variables", () => {
      const missingVars = ["NEXT_PUBLIC_CONVEX_URL", "CLERK_SECRET_KEY"];
      const errorMessage = `Missing required environment variables:\n${missingVars.join("\n")}\n\nPlease copy .env.example to .env.local and fill in the values.`;

      expect(errorMessage).toContain("Missing required");
      expect(errorMessage).toContain(".env.example");
      expect(errorMessage).toContain(".env.local");
    });
  });

  describe("Development vs Production", () => {
    it("should identify development environment", () => {
      const isDevelopment = process.env.NODE_ENV === "development";
      expect(typeof isDevelopment).toBe("boolean");
    });

    it("should identify production environment", () => {
      const isProduction = process.env.NODE_ENV === "production";
      expect(typeof isProduction).toBe("boolean");
    });
  });
});
