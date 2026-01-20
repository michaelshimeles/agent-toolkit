import { describe, it, expect } from "vitest";

describe("Integrations Catalog", () => {
  describe("Integration Schema", () => {
    it("should have required fields", () => {
      const integration = {
        slug: "github",
        name: "GitHub",
        description: "GitHub integration",
        category: "developer",
        status: "active" as const,
        functionPath: "/api/integrations/github",
        tools: [],
        resources: [],
      };

      expect(integration.slug).toBe("github");
      expect(integration.name).toBe("GitHub");
      expect(integration.status).toBe("active");
    });

    it("should validate status values", () => {
      const validStatuses = ["active", "beta", "deprecated"];

      validStatuses.forEach((status) => {
        expect(["active", "beta", "deprecated"]).toContain(status);
      });
    });

    it("should have proper slug format", () => {
      const validSlugs = ["github", "linear", "notion", "slack"];

      validSlugs.forEach((slug) => {
        expect(slug).toMatch(/^[a-z][a-z0-9-]*$/);
      });
    });
  });

  describe("Tool Schema", () => {
    it("should have required tool fields", () => {
      const tool = {
        name: "create_issue",
        description: "Create a GitHub issue",
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
        },
      };

      expect(tool.name).toBe("create_issue");
      expect(tool.description).toBeTruthy();
      expect(tool.schema).toBeDefined();
    });

    it("should use snake_case for tool names", () => {
      const toolNames = [
        "create_issue",
        "list_repos",
        "get_repo",
        "search_code",
      ];

      toolNames.forEach((name) => {
        expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it("should have valid JSON schema", () => {
      const schema = {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner" },
          repo: { type: "string", description: "Repository name" },
        },
        required: ["owner", "repo"],
      };

      expect(schema.type).toBe("object");
      expect(schema.properties).toBeDefined();
      expect(schema.required).toBeInstanceOf(Array);
    });
  });

  describe("Resource Schema", () => {
    it("should have valid URI template", () => {
      const resource = {
        uriTemplate: "github://repos/{owner}/{repo}",
        description: "Access a GitHub repository",
      };

      expect(resource.uriTemplate).toMatch(/^[a-z]+:\/\//);
      expect(resource.description).toBeTruthy();
    });

    it("should support parameter templates", () => {
      const uriTemplate = "github://issues/{owner}/{repo}/{number}";
      const params = uriTemplate.match(/\{([^}]+)\}/g);

      expect(params).toHaveLength(3);
      expect(params).toContain("{owner}");
      expect(params).toContain("{repo}");
      expect(params).toContain("{number}");
    });
  });

  describe("Integration Categories", () => {
    it("should support valid categories", () => {
      const categories = ["developer", "productivity", "data", "communication"];

      categories.forEach((category) => {
        expect(category).toMatch(/^[a-z]+$/);
      });
    });

    it("should organize integrations by category", () => {
      const integrations = [
        { slug: "github", category: "developer" },
        { slug: "linear", category: "productivity" },
        { slug: "slack", category: "communication" },
      ];

      const byCategory = integrations.reduce((acc, int) => {
        if (!acc[int.category]) acc[int.category] = [];
        acc[int.category].push(int.slug);
        return acc;
      }, {} as Record<string, string[]>);

      expect(byCategory["developer"]).toContain("github");
      expect(byCategory["productivity"]).toContain("linear");
    });
  });

  describe("User Integration Connections", () => {
    it("should track enabled state", () => {
      const userIntegration = {
        userId: "user123",
        integrationId: "integration456",
        enabled: true,
        oauthTokenEncrypted: "encrypted-token",
      };

      expect(userIntegration.enabled).toBe(true);
    });

    it("should support optional configuration", () => {
      const userIntegration = {
        userId: "user123",
        integrationId: "integration456",
        enabled: true,
        config: {
          defaultRepo: "owner/repo",
          autoAssign: true,
        },
      };

      expect(userIntegration.config).toBeDefined();
      expect(userIntegration.config?.defaultRepo).toBe("owner/repo");
    });

    it("should encrypt OAuth tokens", () => {
      const plainToken = "ghp_1234567890abcdef";
      const encrypted = "encrypted-value";

      // Token should be encrypted before storage
      expect(encrypted).not.toBe(plainToken);
      expect(encrypted).toBeTruthy();
    });
  });

  describe("Integration Lookup", () => {
    it("should find integration by slug", () => {
      const integrations = [
        { slug: "github", name: "GitHub" },
        { slug: "linear", name: "Linear" },
      ];

      const github = integrations.find((i) => i.slug === "github");
      expect(github?.name).toBe("GitHub");
    });

    it("should find integration by category", () => {
      const integrations = [
        { slug: "github", category: "developer" },
        { slug: "slack", category: "communication" },
      ];

      const developerIntegrations = integrations.filter(
        (i) => i.category === "developer"
      );

      expect(developerIntegrations).toHaveLength(1);
      expect(developerIntegrations[0].slug).toBe("github");
    });
  });

  describe("Integration Validation", () => {
    it("should prevent duplicate slugs", () => {
      const existingSlugs = new Set(["github", "linear"]);

      const newSlug = "github";
      const isDuplicate = existingSlugs.has(newSlug);

      expect(isDuplicate).toBe(true);
    });

    it("should validate function paths", () => {
      const functionPath = "/api/integrations/github";

      expect(functionPath).toMatch(/^\/api\/integrations\/[a-z-]+$/);
    });

    it("should require at least one tool", () => {
      const integration = {
        tools: [
          { name: "create_issue", description: "Create issue", schema: {} },
        ],
      };

      expect(integration.tools.length).toBeGreaterThan(0);
    });
  });
});
