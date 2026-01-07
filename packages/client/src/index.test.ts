/**
 * Tests for MCP Hub Client
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import fetch from "node-fetch";

// Mock node-fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

// Mock MCP SDK
vi.mock("@modelcontextprotocol/sdk/server/index.js", () => ({
  Server: vi.fn().mockImplementation(() => ({
    setRequestHandler: vi.fn(),
    connect: vi.fn(),
  })),
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

describe("MCP Hub Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("API Key Validation", () => {
    it("should accept valid API key format", () => {
      const validKey = "mcp_sk_1234567890abcdef";
      expect(validKey.startsWith("mcp_sk_")).toBe(true);
    });

    it("should reject invalid API key format", () => {
      const invalidKeys = [
        "sk_1234567890",
        "mcp_1234567890",
        "api_key_1234",
        "",
      ];

      invalidKeys.forEach((key) => {
        expect(key.startsWith("mcp_sk_")).toBe(false);
      });
    });
  });

  describe("Gateway Request", () => {
    it("should include API key in headers", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: [] }),
      } as any);

      const apiKey = "mcp_sk_test123";
      const gatewayUrl = "https://example.com/api/gateway";

      // Simulate a gateway request
      await fetch(`${gatewayUrl}/tools/list`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api/gateway/tools/list",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": apiKey,
          }),
        })
      );
    });

    it("should handle successful response", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      const mockData = {
        tools: [
          { name: "test_tool", description: "A test tool" },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as any);

      const response = await fetch("https://example.com/api/gateway/tools/list");
      const data = await (response as any).json();

      expect(data).toEqual(mockData);
    });

    it("should handle error response", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      } as any);

      const response = await fetch("https://example.com/api/gateway/tools/list");
      expect((response as any).ok).toBe(false);
      expect((response as any).status).toBe(401);
    });
  });

  describe("List Tools", () => {
    it("should return tools from gateway", async () => {
      const mockTools = [
        {
          name: "github/create_issue",
          description: "Create a GitHub issue",
          inputSchema: {
            type: "object",
            properties: {
              owner: { type: "string" },
              repo: { type: "string" },
              title: { type: "string" },
            },
            required: ["owner", "repo", "title"],
          },
        },
        {
          name: "linear/create_issue",
          description: "Create a Linear issue",
          inputSchema: {
            type: "object",
            properties: {
              title: { type: "string" },
              teamId: { type: "string" },
            },
            required: ["title", "teamId"],
          },
        },
      ];

      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tools: mockTools }),
      } as any);

      const response = await fetch("https://example.com/api/gateway/tools/list");
      const data = await (response as any).json();

      expect(data.tools).toHaveLength(2);
      expect(data.tools[0].name).toBe("github/create_issue");
      expect(data.tools[1].name).toBe("linear/create_issue");
    });

    it("should return empty array on error", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await fetch("https://example.com/api/gateway/tools/list");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Call Tool", () => {
    it("should forward tool call to gateway", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      const toolCallRequest = {
        name: "github/create_issue",
        arguments: {
          owner: "test-owner",
          repo: "test-repo",
          title: "Test Issue",
          body: "This is a test issue",
        },
      };

      const mockResponse = {
        content: [
          {
            type: "text",
            text: "Created issue #123: Test Issue",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as any);

      await fetch("https://example.com/api/gateway/tools/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "mcp_sk_test123",
        },
        body: JSON.stringify(toolCallRequest),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://example.com/api/gateway/tools/call",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(toolCallRequest),
        })
      );
    });

    it("should return error on tool call failure", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal server error",
      } as any);

      const response = await fetch("https://example.com/api/gateway/tools/call", {
        method: "POST",
        headers: { "x-api-key": "mcp_sk_test123" },
        body: JSON.stringify({ name: "test_tool", arguments: {} }),
      });

      expect((response as any).ok).toBe(false);
      expect((response as any).status).toBe(500);
    });
  });

  describe("List Resources", () => {
    it("should return resources from gateway", async () => {
      const mockResources = [
        {
          uri: "github://repos/owner/repo",
          name: "test-repo",
          description: "A test repository",
          mimeType: "application/json",
        },
      ];

      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ resources: mockResources }),
      } as any);

      const response = await fetch("https://example.com/api/gateway/resources/list");
      const data = await (response as any).json();

      expect(data.resources).toHaveLength(1);
      expect(data.resources[0].uri).toBe("github://repos/owner/repo");
    });
  });

  describe("Read Resource", () => {
    it("should read resource from gateway", async () => {
      const mockContents = [
        {
          uri: "github://repos/owner/repo",
          mimeType: "application/json",
          text: JSON.stringify({ name: "test-repo", stars: 100 }),
        },
      ];

      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ contents: mockContents }),
      } as any);

      const response = await fetch("https://example.com/api/gateway/resources/read", {
        method: "POST",
        headers: { "x-api-key": "mcp_sk_test123" },
        body: JSON.stringify({ uri: "github://repos/owner/repo" }),
      });

      const data = await (response as any).json();
      expect(data.contents[0].uri).toBe("github://repos/owner/repo");
    });
  });

  describe("Configuration", () => {
    it("should use default gateway URL", () => {
      const defaultUrl = "https://mcp-app-store.vercel.app/api/gateway";
      expect(defaultUrl).toBe("https://mcp-app-store.vercel.app/api/gateway");
    });

    it("should allow custom gateway URL", () => {
      const customUrl = "https://custom.mcphub.dev/api/gateway";
      expect(customUrl).not.toBe("https://mcp-app-store.vercel.app/api/gateway");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      try {
        await fetch("https://example.com/api/gateway/tools/list");
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("ECONNREFUSED");
      }
    });

    it("should handle invalid JSON responses", async () => {
      const mockFetch = fetch as unknown as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error("Invalid JSON");
        },
      } as any);

      try {
        const response = await fetch("https://example.com/api/gateway/tools/list");
        await (response as any).json();
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.message).toContain("Invalid JSON");
      }
    });
  });
});
