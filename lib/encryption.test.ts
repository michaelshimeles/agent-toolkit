import { describe, it, expect, beforeAll } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  encrypt,
  decrypt,
  parseNamespace,
} from "./encryption";

// Set encryption key for tests (64-character hex string)
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("encryption utilities", () => {
  describe("generateApiKey", () => {
    it("should generate an API key with the correct prefix", () => {
      const apiKey = generateApiKey();
      expect(apiKey).toMatch(/^mcp_sk_[a-f0-9]{64}$/);
    });

    it("should generate unique API keys", () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe("hashApiKey", () => {
    it("should hash an API key consistently", () => {
      const apiKey = "mcp_sk_test123";
      const hash1 = hashApiKey(apiKey);
      const hash2 = hashApiKey(apiKey);
      expect(hash1).toBe(hash2);
    });

    it("should produce different hashes for different keys", () => {
      const key1 = "mcp_sk_test123";
      const key2 = "mcp_sk_test456";
      const hash1 = hashApiKey(key1);
      const hash2 = hashApiKey(key2);
      expect(hash1).not.toBe(hash2);
    });

    it("should produce a 64-character hex string", () => {
      const apiKey = "mcp_sk_test123";
      const hash = hashApiKey(apiKey);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt text correctly", () => {
      const original = "my-secret-token-12345";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should produce different ciphertext for same plaintext", () => {
      const text = "my-secret-token";
      const encrypted1 = encrypt(text);
      const encrypted2 = encrypt(text);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle special characters", () => {
      const original = "token!@#$%^&*()_+-={}[]|:;<>?,./'";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should handle unicode characters", () => {
      const original = "🔐🛡️ secret token 中文 مرحبا";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it("should handle empty string", () => {
      const original = "";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });
  });

  describe("parseNamespace", () => {
    it("should parse valid namespace correctly", () => {
      const [integration, tool] = parseNamespace("github/create_issue");
      expect(integration).toBe("github");
      expect(tool).toBe("create_issue");
    });

    it("should throw error for invalid format without slash", () => {
      expect(() => parseNamespace("github_create_issue")).toThrow(
        "Invalid tool name format"
      );
    });

    it("should throw error for multiple slashes", () => {
      expect(() => parseNamespace("github/create/issue")).toThrow(
        "Invalid tool name format"
      );
    });

    it("should throw error for empty string", () => {
      expect(() => parseNamespace("")).toThrow("Invalid tool name format");
    });

    it("should throw error for only slash", () => {
      expect(() => parseNamespace("/")).toThrow("Invalid tool name format");
    });

    it("should handle underscores and hyphens", () => {
      const [integration, tool] = parseNamespace("linear-io/create_issue_v2");
      expect(integration).toBe("linear-io");
      expect(tool).toBe("create_issue_v2");
    });
  });
});
