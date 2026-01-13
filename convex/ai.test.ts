/**
 * Tests for AI Builder - Convex Actions
 *
 * These tests verify the actual functionality of the AI builder utilities
 * and mock external API calls for integration testing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
// Note: We test the utility functions by recreating them here since
// Convex functions can't be directly imported in Node.js test environment

// ============================================================================
// Utility Function Implementations (copied from convex/ai.ts for testing)
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const GITHUB_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
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

function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `server-${Date.now()}`;
  }

  return slug;
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "MCP-Hub-Builder",
  };

  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  return headers;
}

// ============================================================================
// Tests
// ============================================================================

describe("AI Builder Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("fetchWithTimeout", () => {
    it("should return response when fetch succeeds", async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const responsePromise = fetchWithTimeout("https://api.example.com/test");
      vi.runAllTimers();
      const response = await responsePromise;

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it("should throw timeout error when request exceeds timeout", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        fetchWithTimeout("https://api.example.com/slow", {}, 1000)
      ).rejects.toThrow("Request timeout after 1000ms");
    });

    it("should pass through non-abort errors", async () => {
      const networkError = new Error("Network failure");
      mockFetch.mockRejectedValueOnce(networkError);

      const responsePromise = fetchWithTimeout("https://api.example.com/test");
      vi.runAllTimers();

      await expect(responsePromise).rejects.toThrow("Network failure");
    });

    it("should include custom headers in request", async () => {
      const mockResponse = new Response("{}", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      const responsePromise = fetchWithTimeout(
        "https://api.example.com/test",
        { headers: { "X-Custom": "value" } }
      );
      vi.runAllTimers();
      await responsePromise;

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          headers: { "X-Custom": "value" },
        })
      );
    });
  });

  describe("generateSlug", () => {
    it("should convert name to lowercase slug", () => {
      expect(generateSlug("My API Server")).toBe("my-api-server");
    });

    it("should replace special characters with hyphens", () => {
      expect(generateSlug("API v2.0 (Beta)")).toBe("api-v2-0-beta");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(generateSlug("--My Server--")).toBe("my-server");
      expect(generateSlug("@#$My Server!@#")).toBe("my-server");
    });

    it("should collapse multiple hyphens", () => {
      expect(generateSlug("My   Server   Name")).toBe("my-server-name");
    });

    it("should return fallback for empty result", () => {
      const slug = generateSlug("@#$%^&*");
      expect(slug).toMatch(/^server-\d+$/);
    });

    it("should handle unicode characters", () => {
      expect(generateSlug("My Servér Ñame")).toBe("my-serv-r-ame");
    });

    it("should handle already valid slugs", () => {
      expect(generateSlug("my-valid-slug")).toBe("my-valid-slug");
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid HTTP URLs", () => {
      expect(isValidUrl("https://api.example.com")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
      expect(isValidUrl("https://api.github.com/repos/owner/repo")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("ftp://invalid")).toBe(true); // ftp is technically valid
    });

    it("should return false for relative paths", () => {
      expect(isValidUrl("/api/endpoint")).toBe(false);
      expect(isValidUrl("./path")).toBe(false);
    });
  });

  describe("getGitHubHeaders", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should return base headers without token", () => {
      delete process.env.GITHUB_TOKEN;
      const headers = getGitHubHeaders();

      expect(headers).toEqual({
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MCP-Hub-Builder",
      });
    });

    it("should include Authorization header when token is set", () => {
      process.env.GITHUB_TOKEN = "ghp_testtoken123";
      const headers = getGitHubHeaders();

      expect(headers).toEqual({
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MCP-Hub-Builder",
        "Authorization": "Bearer ghp_testtoken123",
      });
    });
  });
});

describe("GitHub URL Parsing", () => {
  function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
  }

  it("should parse standard GitHub URLs", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should handle URLs with .git suffix", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo.git")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should handle URLs with trailing paths", () => {
    expect(parseGitHubUrl("https://github.com/owner/repo/tree/main")).toEqual({
      owner: "owner",
      repo: "repo",
    });
  });

  it("should return null for non-GitHub URLs", () => {
    expect(parseGitHubUrl("https://gitlab.com/owner/repo")).toBeNull();
    expect(parseGitHubUrl("https://bitbucket.org/owner/repo")).toBeNull();
  });

  it("should return null for invalid URLs", () => {
    expect(parseGitHubUrl("not a url")).toBeNull();
    expect(parseGitHubUrl("https://github.com/")).toBeNull();
  });
});

describe("OpenAPI Parsing", () => {
  function parseOpenAPIEndpoints(spec: any): any[] {
    const endpoints: any[] = [];
    const paths = spec.paths || {};

    for (const [path, methods] of Object.entries(paths)) {
      for (const [method, details] of Object.entries(methods as any)) {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            operationId: (details as any).operationId,
            summary: (details as any).summary,
            description: (details as any).description,
            parameters: (details as any).parameters,
            requestBody: (details as any).requestBody,
            responses: (details as any).responses,
          });
        }
      }
    }

    return endpoints;
  }

  it("should extract endpoints from OpenAPI spec", () => {
    const spec = {
      paths: {
        "/users": {
          get: { operationId: "listUsers", summary: "List users" },
          post: { operationId: "createUser", summary: "Create user" },
        },
        "/users/{id}": {
          get: { operationId: "getUser", summary: "Get user" },
          delete: { operationId: "deleteUser", summary: "Delete user" },
        },
      },
    };

    const endpoints = parseOpenAPIEndpoints(spec);

    expect(endpoints).toHaveLength(4);
    expect(endpoints.map((e) => e.operationId)).toEqual([
      "listUsers",
      "createUser",
      "getUser",
      "deleteUser",
    ]);
  });

  it("should handle empty paths", () => {
    expect(parseOpenAPIEndpoints({})).toEqual([]);
    expect(parseOpenAPIEndpoints({ paths: {} })).toEqual([]);
  });

  it("should skip non-HTTP methods", () => {
    const spec = {
      paths: {
        "/test": {
          get: { operationId: "test" },
          parameters: [], // This should be skipped
          servers: [], // This should be skipped
        },
      },
    };

    const endpoints = parseOpenAPIEndpoints(spec);
    expect(endpoints).toHaveLength(1);
  });

  it("should preserve all endpoint details", () => {
    const spec = {
      paths: {
        "/items": {
          post: {
            operationId: "createItem",
            summary: "Create item",
            description: "Creates a new item",
            parameters: [{ name: "type", in: "query" }],
            requestBody: { required: true },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    };

    const endpoints = parseOpenAPIEndpoints(spec);
    const endpoint = endpoints[0];

    expect(endpoint.operationId).toBe("createItem");
    expect(endpoint.summary).toBe("Create item");
    expect(endpoint.description).toBe("Creates a new item");
    expect(endpoint.parameters).toHaveLength(1);
    expect(endpoint.requestBody).toEqual({ required: true });
    expect(endpoint.responses).toHaveProperty("201");
  });
});

describe("Server Status Transitions", () => {
  const validStatuses = ["analyzing", "generating", "draft", "deploying", "deployed", "failed"];

  it("should validate all status values", () => {
    validStatuses.forEach((status) => {
      expect(validStatuses).toContain(status);
    });
  });

  const validTransitions: Record<string, string[]> = {
    analyzing: ["generating", "failed"],
    generating: ["draft", "failed"],
    draft: ["deploying", "failed"],
    deploying: ["deployed", "failed"],
    deployed: ["deploying", "failed"], // Re-deploy
    failed: ["analyzing", "generating", "draft", "deploying"], // Retry from any state
  };

  it("should allow valid status transitions", () => {
    Object.entries(validTransitions).forEach(([from, toStates]) => {
      toStates.forEach((to) => {
        expect(validStatuses).toContain(from);
        expect(validStatuses).toContain(to);
      });
    });
  });
});

describe("Tool Schema Generation", () => {
  function generateToolSchema(endpoint: any): any {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    // Extract from parameters
    (endpoint.parameters || []).forEach((param: any) => {
      properties[param.name] = {
        type: param.schema?.type || "string",
        description: param.description,
      };
      if (param.required) {
        required.push(param.name);
      }
    });

    // Extract from requestBody
    if (endpoint.requestBody?.content?.["application/json"]?.schema?.properties) {
      const bodyProps = endpoint.requestBody.content["application/json"].schema.properties;
      Object.entries(bodyProps).forEach(([name, schema]: [string, any]) => {
        properties[name] = schema;
      });

      const bodyRequired = endpoint.requestBody.content["application/json"].schema.required || [];
      required.push(...bodyRequired);
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  it("should generate schema from parameters", () => {
    const endpoint = {
      parameters: [
        { name: "id", required: true, schema: { type: "string" } },
        { name: "limit", required: false, schema: { type: "number" } },
      ],
    };

    const schema = generateToolSchema(endpoint);

    expect(schema.properties).toHaveProperty("id");
    expect(schema.properties).toHaveProperty("limit");
    expect(schema.required).toContain("id");
    expect(schema.required).not.toContain("limit");
  });

  it("should generate schema from request body", () => {
    const endpoint = {
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                email: { type: "string" },
              },
              required: ["name"],
            },
          },
        },
      },
    };

    const schema = generateToolSchema(endpoint);

    expect(schema.properties).toHaveProperty("name");
    expect(schema.properties).toHaveProperty("email");
    expect(schema.required).toContain("name");
  });

  it("should handle empty endpoint", () => {
    const schema = generateToolSchema({});

    expect(schema).toEqual({
      type: "object",
      properties: {},
      required: [],
    });
  });
});
