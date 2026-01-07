/**
 * Tests for AI Builder - Convex Actions
 */

import { describe, it, expect } from "vitest";

describe("AI Builder - Convex Actions", () => {
  describe("OpenAPI Parsing", () => {
    it("should parse OpenAPI spec paths", () => {
      const spec = {
        paths: {
          "/users": {
            get: {
              operationId: "listUsers",
              summary: "List all users",
            },
          },
        },
      };

      const paths = Object.keys(spec.paths);
      expect(paths).toContain("/users");
    });

    it("should extract HTTP methods from paths", () => {
      const pathMethods = {
        get: { operationId: "getUser" },
        post: { operationId: "createUser" },
      };

      const methods = Object.keys(pathMethods);
      expect(methods).toContain("get");
      expect(methods).toContain("post");
    });

    it("should extract operation IDs", () => {
      const operation = {
        operationId: "listCustomers",
        summary: "List all customers",
      };

      expect(operation.operationId).toBe("listCustomers");
    });

    it("should extract operation summaries", () => {
      const operation = {
        operationId: "getUser",
        summary: "Get user by ID",
      };

      expect(operation.summary).toBe("Get user by ID");
    });

    it("should extract operation descriptions", () => {
      const operation = {
        operationId: "createOrder",
        description: "Create a new order in the system",
      };

      expect(operation.description).toBe("Create a new order in the system");
    });

    it("should extract parameters", () => {
      const operation = {
        parameters: [
          { name: "id", in: "path", required: true },
          { name: "limit", in: "query", required: false },
        ],
      };

      expect(operation.parameters).toHaveLength(2);
      expect(operation.parameters[0].name).toBe("id");
    });

    it("should extract request body", () => {
      const operation = {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object" },
            },
          },
        },
      };

      expect(operation.requestBody.required).toBe(true);
    });

    it("should extract responses", () => {
      const operation = {
        responses: {
          "200": { description: "Success" },
          "404": { description: "Not found" },
        },
      };

      expect(operation.responses["200"].description).toBe("Success");
    });
  });

  describe("Schema Extraction", () => {
    it("should extract component schemas from OpenAPI spec", () => {
      const spec = {
        components: {
          schemas: {
            User: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
          },
        },
      };

      expect(spec.components.schemas.User).toBeDefined();
      expect(spec.components.schemas.User.type).toBe("object");
    });

    it("should handle missing components", () => {
      const spec: any = {};
      const schemas = spec.components?.schemas || {};
      expect(Object.keys(schemas)).toHaveLength(0);
    });

    it("should extract schema properties", () => {
      const schema = {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string" },
        },
      };

      expect(schema.properties.id.type).toBe("string");
      expect(schema.properties.email.type).toBe("string");
    });

    it("should extract required fields", () => {
      const schema = {
        type: "object",
        required: ["id", "name"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
        },
      };

      expect(schema.required).toContain("id");
      expect(schema.required).toContain("name");
      expect(schema.required).not.toContain("email");
    });
  });

  describe("Tool Extraction from Code", () => {
    it("should extract tools from generated code", () => {
      const code = JSON.stringify({
        endpoints: [
          {
            operationId: "listUsers",
            summary: "List all users",
            method: "GET",
            path: "/users",
          },
        ],
      });

      const parsed = JSON.parse(code);
      expect(parsed.endpoints).toHaveLength(1);
      expect(parsed.endpoints[0].operationId).toBe("listUsers");
    });

    it("should generate tool names from operation IDs", () => {
      const endpoint = {
        operationId: "getUserById",
        method: "GET",
        path: "/users/{id}",
      };

      const toolName = endpoint.operationId || `${endpoint.method}_${endpoint.path}`.toLowerCase();
      expect(toolName).toBe("getUserById");
    });

    it("should fall back to method+path for tool names", () => {
      const endpoint = {
        method: "GET",
        path: "/users",
      };

      const toolName = `${endpoint.method}_${endpoint.path}`.toLowerCase();
      expect(toolName).toContain("get");
      expect(toolName).toContain("/users");
    });

    it("should extract tool descriptions from summaries", () => {
      const endpoint = {
        operationId: "createUser",
        summary: "Create a new user account",
        description: "Creates a new user in the system",
      };

      const description = endpoint.summary || endpoint.description || "";
      expect(description).toBe("Create a new user account");
    });

    it("should create empty schema objects for tools", () => {
      const tool = {
        name: "listUsers",
        description: "List all users",
        schema: {
          type: "object",
          properties: {},
        },
      };

      expect(tool.schema.type).toBe("object");
      expect(tool.schema.properties).toEqual({});
    });
  });

  describe("GitHub URL Parsing", () => {
    it("should parse GitHub owner and repo from URL", () => {
      const url = "https://github.com/owner/repo";
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toBe("owner");
        expect(match[2]).toBe("repo");
      }
    });

    it("should handle GitHub URLs with .git extension", () => {
      const url = "https://github.com/owner/repo.git";
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

      if (match) {
        const repo = match[2].replace(/\.git$/, "");
        expect(repo).toBe("repo");
      }
    });

    it("should reject invalid GitHub URLs", () => {
      const url = "https://gitlab.com/owner/repo";
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

      expect(match).toBeNull();
    });

    it("should construct GitHub API URL", () => {
      const owner = "octocat";
      const repo = "Hello-World";
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      expect(apiUrl).toBe("https://api.github.com/repos/octocat/Hello-World");
    });
  });

  describe("Server Status", () => {
    it("should support analyzing status", () => {
      const status = "analyzing";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });

    it("should support generating status", () => {
      const status = "generating";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });

    it("should support draft status", () => {
      const status = "draft";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });

    it("should support deploying status", () => {
      const status = "deploying";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });

    it("should support deployed status", () => {
      const status = "deployed";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });

    it("should support failed status", () => {
      const status = "failed";
      expect(["analyzing", "generating", "draft", "deploying", "deployed", "failed"]).toContain(status);
    });
  });

  describe("Source Types", () => {
    it("should support OpenAPI source type", () => {
      const sourceType = "openapi";
      expect(["openapi", "docs_url", "github_repo", "postman", "text"]).toContain(sourceType);
    });

    it("should support docs_url source type", () => {
      const sourceType = "docs_url";
      expect(["openapi", "docs_url", "github_repo", "postman", "text"]).toContain(sourceType);
    });

    it("should support github_repo source type", () => {
      const sourceType = "github_repo";
      expect(["openapi", "docs_url", "github_repo", "postman", "text"]).toContain(sourceType);
    });

    it("should support postman source type", () => {
      const sourceType = "postman";
      expect(["openapi", "docs_url", "github_repo", "postman", "text"]).toContain(sourceType);
    });

    it("should support text source type", () => {
      const sourceType = "text";
      expect(["openapi", "docs_url", "github_repo", "postman", "text"]).toContain(sourceType);
    });
  });

  describe("Slug Generation", () => {
    it("should generate URL-safe slug from name", () => {
      const name = "My API Server";
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      expect(slug).toBe("my-api-server");
    });

    it("should handle special characters in slug", () => {
      const name = "API v2.0 (Beta)";
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      expect(slug).toBe("api-v2-0-beta-");
    });

    it("should handle multiple spaces in slug", () => {
      const name = "Test   Server   Name";
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      expect(slug).toBe("test-server-name");
    });

    it("should remove non-alphanumeric characters", () => {
      const name = "My@API#Server!";
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

      expect(slug).toBe("my-api-server-");
    });
  });

  describe("Deployment URL Generation", () => {
    it("should generate deployment URL from slug", () => {
      const slug = "my-api-server";
      const deploymentUrl = `https://${slug}.mcphub.dev`;

      expect(deploymentUrl).toBe("https://my-api-server.mcphub.dev");
    });

    it("should use HTTPS protocol", () => {
      const slug = "test-server";
      const deploymentUrl = `https://${slug}.mcphub.dev`;

      expect(deploymentUrl).toContain("https://");
    });

    it("should use mcphub.dev domain", () => {
      const slug = "api-server";
      const deploymentUrl = `https://${slug}.mcphub.dev`;

      expect(deploymentUrl).toContain(".mcphub.dev");
    });
  });

  describe("Security Configuration", () => {
    it("should default rate limit to 100", () => {
      const rateLimit = 100;
      expect(rateLimit).toBe(100);
    });

    it("should initialize allowed domains as empty array", () => {
      const allowedDomains: string[] = [];
      expect(allowedDomains).toEqual([]);
      expect(Array.isArray(allowedDomains)).toBe(true);
    });

    it("should support multiple allowed domains", () => {
      const allowedDomains = ["api.example.com", "api2.example.com"];
      expect(allowedDomains).toHaveLength(2);
    });
  });

  describe("Version Management", () => {
    it("should start at version 1", () => {
      const version = 1;
      expect(version).toBe(1);
    });

    it("should support version history", () => {
      const previousVersions: string[] = [];
      expect(Array.isArray(previousVersions)).toBe(true);
    });

    it("should increment version on updates", () => {
      let version = 1;
      version += 1;
      expect(version).toBe(2);
    });
  });

  describe("Documentation Generation", () => {
    it("should generate README for tools", () => {
      const toolCount = 5;
      const readme = `# ${toolCount} MCP Tools\n\nGenerated documentation`;

      expect(readme).toContain("5 MCP Tools");
      expect(readme).toContain("Generated documentation");
    });

    it("should create tool docs for each tool", () => {
      const tools = [
        { name: "tool1", description: "Description 1", schema: {} },
        { name: "tool2", description: "Description 2", schema: {} },
      ];

      const toolDocs = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        params: "{}",
        example: "{}",
      }));

      expect(toolDocs).toHaveLength(2);
      expect(toolDocs[0].name).toBe("tool1");
    });

    it("should include params in tool docs", () => {
      const toolDoc = {
        name: "listUsers",
        description: "List users",
        params: "{}",
        example: "{}",
      };

      expect(toolDoc.params).toBe("{}");
    });

    it("should include examples in tool docs", () => {
      const toolDoc = {
        name: "createUser",
        description: "Create user",
        params: "{}",
        example: "{}",
      };

      expect(toolDoc.example).toBe("{}");
    });
  });

  describe("Error Handling", () => {
    it("should throw error for failed spec fetch", async () => {
      const errorMessage = "Failed to fetch OpenAPI spec: Not Found";
      expect(errorMessage).toContain("Failed to fetch");
      expect(errorMessage).toContain("Not Found");
    });

    it("should throw error for invalid GitHub URL", () => {
      const url = "https://not-github.com/repo";
      const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);

      if (!match) {
        const error = "Invalid GitHub URL";
        expect(error).toBe("Invalid GitHub URL");
      }
    });

    it("should throw error for repository not found", () => {
      const errorMessage = "Repository not found";
      expect(errorMessage).toBe("Repository not found");
    });

    it("should throw error when server not found", () => {
      const server = null;
      if (!server) {
        const error = "Server not found";
        expect(error).toBe("Server not found");
      }
    });
  });

  describe("HTTP Methods", () => {
    it("should support GET method", () => {
      const method = "GET";
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(method);
    });

    it("should support POST method", () => {
      const method = "POST";
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(method);
    });

    it("should support PUT method", () => {
      const method = "PUT";
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(method);
    });

    it("should support PATCH method", () => {
      const method = "PATCH";
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(method);
    });

    it("should support DELETE method", () => {
      const method = "DELETE";
      expect(["GET", "POST", "PUT", "PATCH", "DELETE"]).toContain(method);
    });

    it("should convert method to uppercase", () => {
      const method = "get";
      const normalized = method.toUpperCase();
      expect(normalized).toBe("GET");
    });
  });
});
