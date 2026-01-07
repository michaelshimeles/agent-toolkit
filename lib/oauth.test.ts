import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  generateState,
  validateState,
  encryptToken,
  decryptToken,
  isTokenExpired,
  type OAuthConfig,
  type OAuthTokenResponse,
} from "./oauth";

describe("OAuth Utilities", () => {
  let mockConfig: OAuthConfig;

  beforeEach(() => {
    mockConfig = {
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      authorizationUrl: "https://provider.com/oauth/authorize",
      tokenUrl: "https://provider.com/oauth/token",
      scopes: ["read", "write"],
      redirectUri: "https://app.com/callback",
    };
  });

  describe("generateAuthorizationUrl", () => {
    it("should generate valid authorization URL", () => {
      const state = "random_state_123";
      const url = generateAuthorizationUrl(mockConfig, state);

      expect(url).toContain(mockConfig.authorizationUrl);
      expect(url).toContain(`client_id=${mockConfig.clientId}`);
      expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
      expect(url).toContain(`state=${state}`);
      expect(url).toContain("response_type=code");
    });

    it("should include scopes in URL", () => {
      const state = "state123";
      const url = generateAuthorizationUrl(mockConfig, state);

      // URLSearchParams encodes spaces as +
      expect(url).toContain("scope=read+write");
    });

    it("should handle empty scopes", () => {
      const config = { ...mockConfig, scopes: [] };
      const url = generateAuthorizationUrl(config, "state");

      expect(url).toContain("scope=");
    });

    it("should handle single scope", () => {
      const config = { ...mockConfig, scopes: ["read"] };
      const url = generateAuthorizationUrl(config, "state");

      expect(url).toContain("scope=read");
    });

    it("should handle multiple scopes", () => {
      const config = {
        ...mockConfig,
        scopes: ["read", "write", "delete"],
      };
      const url = generateAuthorizationUrl(config, "state");

      // URLSearchParams encodes spaces as +
      expect(url).toContain("scope=read+write+delete");
    });
  });

  describe("exchangeCodeForToken", () => {
    it("should exchange code for token", async () => {
      const mockToken: OAuthTokenResponse = {
        access_token: "access_token_123",
        token_type: "Bearer",
        expires_in: 3600,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockToken,
      });

      const result = await exchangeCodeForToken(mockConfig, "auth_code_123");

      expect(result).toEqual(mockToken);
      expect(fetch).toHaveBeenCalledWith(
        mockConfig.tokenUrl,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );
    });

    it("should include all required parameters", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });

      await exchangeCodeForToken(mockConfig, "code123");

      const call = (fetch as any).mock.calls[0];
      const body = call[1].body;

      expect(body).toContain("client_id=test_client_id");
      expect(body).toContain("client_secret=test_client_secret");
      expect(body).toContain("code=code123");
      expect(body).toContain("grant_type=authorization_code");
    });

    it("should throw on failed exchange", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => "Invalid code",
      });

      await expect(
        exchangeCodeForToken(mockConfig, "invalid_code")
      ).rejects.toThrow("OAuth token exchange failed");
    });

    it("should handle token with refresh token", async () => {
      const mockToken: OAuthTokenResponse = {
        access_token: "access",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh",
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockToken,
      });

      const result = await exchangeCodeForToken(mockConfig, "code");

      expect(result.refresh_token).toBe("refresh");
    });
  });

  describe("refreshAccessToken", () => {
    it("should refresh access token", async () => {
      const mockToken: OAuthTokenResponse = {
        access_token: "new_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockToken,
      });

      const result = await refreshAccessToken(mockConfig, "refresh_token_123");

      expect(result).toEqual(mockToken);
    });

    it("should use refresh token grant type", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: "token" }),
      });

      await refreshAccessToken(mockConfig, "refresh");

      const call = (fetch as any).mock.calls[0];
      const body = call[1].body;

      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=refresh");
    });

    it("should throw on failed refresh", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        text: async () => "Invalid refresh token",
      });

      await expect(
        refreshAccessToken(mockConfig, "invalid")
      ).rejects.toThrow("OAuth token refresh failed");
    });
  });

  describe("generateState", () => {
    it("should generate random state", () => {
      const state1 = generateState();
      const state2 = generateState();

      expect(state1).toBeTruthy();
      expect(state2).toBeTruthy();
      expect(state1).not.toBe(state2);
    });

    it("should generate hex string", () => {
      const state = generateState();
      expect(state).toMatch(/^[0-9a-f]+$/);
    });

    it("should generate 64 character string", () => {
      const state = generateState();
      expect(state).toHaveLength(64);
    });
  });

  describe("validateState", () => {
    it("should validate matching states", () => {
      const state = "state123";
      expect(validateState(state, state)).toBe(true);
    });

    it("should reject non-matching states", () => {
      expect(validateState("state1", "state2")).toBe(false);
    });

    it("should be case sensitive", () => {
      expect(validateState("State", "state")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(validateState("", "")).toBe(true);
      expect(validateState("", "state")).toBe(false);
    });
  });

  describe("encryptToken & decryptToken", () => {
    it("should encrypt and decrypt token", () => {
      const token: OAuthTokenResponse = {
        access_token: "access_123",
        token_type: "Bearer",
        expires_in: 3600,
        refresh_token: "refresh_123",
      };

      const encrypted = encryptToken(token);
      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toContain("access_123");

      const decrypted = decryptToken(encrypted);
      expect(decrypted).toEqual(token);
    });

    it("should handle token without optional fields", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
      };

      const encrypted = encryptToken(token);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toEqual(token);
    });

    it("should produce different ciphertext for same token", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
      };

      const encrypted1 = encryptToken(token);
      const encrypted2 = encryptToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("isTokenExpired", () => {
    it("should detect expired token", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600, // 1 hour
      };

      const issuedAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      expect(isTokenExpired(token, issuedAt)).toBe(true);
    });

    it("should detect valid token", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      const issuedAt = Date.now() - 30 * 60 * 1000; // 30 minutes ago
      expect(isTokenExpired(token, issuedAt)).toBe(false);
    });

    it("should handle token without expiration", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
      };

      const issuedAt = Date.now() - 10 * 60 * 60 * 1000;
      expect(isTokenExpired(token, issuedAt)).toBe(false);
    });

    it("should use 5 minute buffer", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 600, // 10 minutes
      };

      // Issued 6 minutes ago, expires in 4 minutes
      // Should be considered expired due to 5 minute buffer
      const issuedAt = Date.now() - 6 * 60 * 1000;
      expect(isTokenExpired(token, issuedAt)).toBe(true);
    });

    it("should not expire with buffer", () => {
      const token: OAuthTokenResponse = {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 600, // 10 minutes
      };

      // Issued 4 minutes ago, expires in 6 minutes
      // Buffer of 5 minutes, so still 1 minute left
      const issuedAt = Date.now() - 4 * 60 * 1000;
      expect(isTokenExpired(token, issuedAt)).toBe(false);
    });
  });

  describe("OAuth Config Getters", () => {
    beforeEach(() => {
      // Reset environment variables
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;
      delete process.env.LINEAR_CLIENT_ID;
      delete process.env.LINEAR_CLIENT_SECRET;
      delete process.env.NOTION_CLIENT_ID;
      delete process.env.NOTION_CLIENT_SECRET;
    });

    it("should throw if GitHub credentials missing", async () => {
      const { getGitHubOAuthConfig } = await import("./oauth");
      expect(() => getGitHubOAuthConfig()).toThrow(
        "GitHub OAuth credentials not configured"
      );
    });

    it("should throw if Linear credentials missing", async () => {
      const { getLinearOAuthConfig } = await import("./oauth");
      expect(() => getLinearOAuthConfig()).toThrow(
        "Linear OAuth credentials not configured"
      );
    });

    it("should throw if Notion credentials missing", async () => {
      const { getNotionOAuthConfig } = await import("./oauth");
      expect(() => getNotionOAuthConfig()).toThrow(
        "Notion OAuth credentials not configured"
      );
    });
  });

  describe("URL Encoding", () => {
    it("should properly encode redirect URI", () => {
      const config = {
        ...mockConfig,
        redirectUri: "https://app.com/callback?param=value&other=test",
      };

      const url = generateAuthorizationUrl(config, "state");

      expect(url).toContain(
        encodeURIComponent("https://app.com/callback?param=value&other=test")
      );
    });

    it("should handle special characters in state", () => {
      const state = "state+with/special=chars&more";
      const url = generateAuthorizationUrl(mockConfig, state);

      // URLSearchParams properly encodes special characters
      const encoded = encodeURIComponent(state);
      expect(url).toContain(`state=${encoded}`);
    });
  });
});
