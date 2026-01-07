import { describe, it, expect } from "vitest";
import { openApiSpec } from "./openapi";

describe("OpenAPI Specification", () => {
  describe("Basic Structure", () => {
    it("should have valid OpenAPI version", () => {
      expect(openApiSpec.openapi).toBe("3.0.0");
    });

    it("should have info object", () => {
      expect(openApiSpec.info).toBeDefined();
      expect(openApiSpec.info.title).toBe("MCP Hub API");
      expect(openApiSpec.info.version).toBe("1.0.0");
    });

    it("should have description", () => {
      expect(openApiSpec.info.description).toBeDefined();
      expect(openApiSpec.info.description.length).toBeGreaterThan(0);
    });

    it("should have servers defined", () => {
      expect(openApiSpec.servers).toBeDefined();
      expect(openApiSpec.servers.length).toBeGreaterThan(0);
    });

    it("should have development server", () => {
      const devServer = openApiSpec.servers.find(
        (s) => s.description === "Development server"
      );
      expect(devServer).toBeDefined();
      expect(devServer?.url).toMatch(/localhost/);
    });

    it("should have production server", () => {
      const prodServer = openApiSpec.servers.find(
        (s) => s.description === "Production server"
      );
      expect(prodServer).toBeDefined();
      expect(prodServer?.url).toMatch(/https/);
    });
  });

  describe("Tags", () => {
    it("should have tags defined", () => {
      expect(openApiSpec.tags).toBeDefined();
      expect(openApiSpec.tags.length).toBeGreaterThan(0);
    });

    it("should have Gateway tag", () => {
      const gatewayTag = openApiSpec.tags.find((t) => t.name === "Gateway");
      expect(gatewayTag).toBeDefined();
      expect(gatewayTag?.description).toBeDefined();
    });

    it("should have API Keys tag", () => {
      const keysTag = openApiSpec.tags.find((t) => t.name === "API Keys");
      expect(keysTag).toBeDefined();
    });

    it("should have Health tag", () => {
      const healthTag = openApiSpec.tags.find((t) => t.name === "Health");
      expect(healthTag).toBeDefined();
    });

    it("should have Integrations tag", () => {
      const integrationsTag = openApiSpec.tags.find(
        (t) => t.name === "Integrations"
      );
      expect(integrationsTag).toBeDefined();
    });
  });

  describe("Gateway Endpoints", () => {
    it("should have gateway health endpoint", () => {
      expect(openApiSpec.paths["/api/gateway/health"]).toBeDefined();
      expect(openApiSpec.paths["/api/gateway/health"].get).toBeDefined();
    });

    it("should have tools list endpoint", () => {
      expect(openApiSpec.paths["/api/gateway/tools/list"]).toBeDefined();
      expect(openApiSpec.paths["/api/gateway/tools/list"].get).toBeDefined();
    });

    it("should have tools call endpoint", () => {
      expect(openApiSpec.paths["/api/gateway/tools/call"]).toBeDefined();
      expect(openApiSpec.paths["/api/gateway/tools/call"].post).toBeDefined();
    });

    it("should require API key for tools list", () => {
      const endpoint = openApiSpec.paths["/api/gateway/tools/list"].get;
      expect(endpoint.security).toBeDefined();
      expect(endpoint.security?.[0]).toHaveProperty("ApiKeyAuth");
    });

    it("should require API key for tools call", () => {
      const endpoint = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(endpoint.security).toBeDefined();
      expect(endpoint.security?.[0]).toHaveProperty("ApiKeyAuth");
    });
  });

  describe("API Keys Endpoints", () => {
    it("should have keys list endpoint", () => {
      expect(openApiSpec.paths["/api/keys"]).toBeDefined();
      expect(openApiSpec.paths["/api/keys"].get).toBeDefined();
    });

    it("should have keys create endpoint", () => {
      expect(openApiSpec.paths["/api/keys"].post).toBeDefined();
    });

    it("should have keys delete endpoint", () => {
      expect(openApiSpec.paths["/api/keys"].delete).toBeDefined();
    });

    it("should require session auth for keys endpoints", () => {
      const getEndpoint = openApiSpec.paths["/api/keys"].get;
      expect(getEndpoint.security?.[0]).toHaveProperty("SessionAuth");

      const postEndpoint = openApiSpec.paths["/api/keys"].post;
      expect(postEndpoint.security?.[0]).toHaveProperty("SessionAuth");

      const deleteEndpoint = openApiSpec.paths["/api/keys"].delete;
      expect(deleteEndpoint.security?.[0]).toHaveProperty("SessionAuth");
    });
  });

  describe("Health Endpoint", () => {
    it("should have health check endpoint", () => {
      expect(openApiSpec.paths["/api/health"]).toBeDefined();
      expect(openApiSpec.paths["/api/health"].get).toBeDefined();
    });

    it("should return 200 for healthy", () => {
      const endpoint = openApiSpec.paths["/api/health"].get;
      expect(endpoint.responses["200"]).toBeDefined();
    });

    it("should return 503 for unhealthy", () => {
      const endpoint = openApiSpec.paths["/api/health"].get;
      expect(endpoint.responses["503"]).toBeDefined();
    });
  });

  describe("Integration Endpoints", () => {
    it("should have GitHub integration endpoint", () => {
      expect(openApiSpec.paths["/api/integrations/github"]).toBeDefined();
      expect(openApiSpec.paths["/api/integrations/github"].post).toBeDefined();
    });

    it("should require OAuth token for GitHub", () => {
      const endpoint = openApiSpec.paths["/api/integrations/github"].post;
      expect(endpoint.security?.[0]).toHaveProperty("OAuthToken");
    });
  });

  describe("Security Schemes", () => {
    it("should have security schemes defined", () => {
      expect(openApiSpec.components.securitySchemes).toBeDefined();
    });

    it("should have API key auth scheme", () => {
      const apiKeyAuth = openApiSpec.components.securitySchemes.ApiKeyAuth;
      expect(apiKeyAuth).toBeDefined();
      expect(apiKeyAuth.type).toBe("apiKey");
      expect(apiKeyAuth.in).toBe("header");
      expect(apiKeyAuth.name).toBe("x-api-key");
    });

    it("should have session auth scheme", () => {
      const sessionAuth = openApiSpec.components.securitySchemes.SessionAuth;
      expect(sessionAuth).toBeDefined();
      expect(sessionAuth.type).toBe("apiKey");
      expect(sessionAuth.in).toBe("cookie");
    });

    it("should have OAuth token scheme", () => {
      const oauthToken = openApiSpec.components.securitySchemes.OAuthToken;
      expect(oauthToken).toBeDefined();
      expect(oauthToken.type).toBe("apiKey");
      expect(oauthToken.in).toBe("header");
      expect(oauthToken.name).toBe("x-oauth-token");
    });
  });

  describe("Schemas", () => {
    it("should have Tool schema", () => {
      expect(openApiSpec.components.schemas.Tool).toBeDefined();
      expect(openApiSpec.components.schemas.Tool.properties).toHaveProperty(
        "name"
      );
      expect(openApiSpec.components.schemas.Tool.properties).toHaveProperty(
        "description"
      );
    });

    it("should have ApiKey schema", () => {
      expect(openApiSpec.components.schemas.ApiKey).toBeDefined();
      expect(openApiSpec.components.schemas.ApiKey.properties).toHaveProperty(
        "_id"
      );
      expect(openApiSpec.components.schemas.ApiKey.properties).toHaveProperty(
        "name"
      );
    });

    it("should have HealthStatus schema", () => {
      expect(openApiSpec.components.schemas.HealthStatus).toBeDefined();
      expect(
        openApiSpec.components.schemas.HealthStatus.properties
      ).toHaveProperty("status");
      expect(
        openApiSpec.components.schemas.HealthStatus.properties
      ).toHaveProperty("services");
    });

    it("should have Error schema", () => {
      expect(openApiSpec.components.schemas.Error).toBeDefined();
      expect(openApiSpec.components.schemas.Error.properties).toHaveProperty(
        "error"
      );
    });
  });

  describe("Response Codes", () => {
    it("should document 200 success responses", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.responses["200"]).toBeDefined();
    });

    it("should document 400 bad request responses", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.responses["400"]).toBeDefined();
    });

    it("should document 401 unauthorized responses", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.responses["401"]).toBeDefined();
    });

    it("should document 404 not found responses", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.responses["404"]).toBeDefined();
    });

    it("should document 500 server error responses", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.responses["500"]).toBeDefined();
    });
  });

  describe("Request Bodies", () => {
    it("should define request body for tools call", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      expect(toolsCall.requestBody).toBeDefined();
      expect(toolsCall.requestBody?.required).toBe(true);
    });

    it("should define request body for create API key", () => {
      const createKey = openApiSpec.paths["/api/keys"].post;
      expect(createKey.requestBody).toBeDefined();
      expect(createKey.requestBody?.required).toBe(true);
    });

    it("should define request body for GitHub integration", () => {
      const github = openApiSpec.paths["/api/integrations/github"].post;
      expect(github.requestBody).toBeDefined();
    });
  });

  describe("Parameters", () => {
    it("should define query parameter for delete API key", () => {
      const deleteKey = openApiSpec.paths["/api/keys"].delete;
      expect(deleteKey.parameters).toBeDefined();
      expect(deleteKey.parameters?.[0].name).toBe("id");
      expect(deleteKey.parameters?.[0].in).toBe("query");
      expect(deleteKey.parameters?.[0].required).toBe(true);
    });
  });

  describe("Content Types", () => {
    it("should use application/json for responses", () => {
      const toolsList = openApiSpec.paths["/api/gateway/tools/list"].get;
      const content = toolsList.responses["200"].content;
      expect(content).toHaveProperty("application/json");
    });

    it("should use application/json for request bodies", () => {
      const toolsCall = openApiSpec.paths["/api/gateway/tools/call"].post;
      const content = toolsCall.requestBody?.content;
      expect(content).toHaveProperty("application/json");
    });
  });

  describe("Examples", () => {
    it("should provide examples for tool names", () => {
      const schema =
        openApiSpec.paths["/api/gateway/tools/call"].post.requestBody?.content[
          "application/json"
        ].schema;
      expect(schema.properties.name.example).toBe("github/create_issue");
    });

    it("should provide examples for API key names", () => {
      const schema =
        openApiSpec.paths["/api/keys"].post.requestBody?.content[
          "application/json"
        ].schema;
      expect(schema.properties.name.example).toBe("Production Key");
    });
  });

  describe("Validation", () => {
    it("should mark required fields in request bodies", () => {
      const toolsCall =
        openApiSpec.paths["/api/gateway/tools/call"].post.requestBody?.content[
          "application/json"
        ].schema;
      expect(toolsCall.required).toContain("name");
      expect(toolsCall.required).toContain("arguments");
    });

    it("should mark required parameters", () => {
      const deleteKey = openApiSpec.paths["/api/keys"].delete;
      expect(deleteKey.parameters?.[0].required).toBe(true);
    });
  });
});
