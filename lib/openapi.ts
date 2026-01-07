/**
 * OpenAPI 3.0 specification for MCP Hub API
 * Provides comprehensive API documentation
 */

export const openApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "MCP Hub API",
    version: "1.0.0",
    description:
      "The unified integration layer for AI agents. Connect once, access everything through a single MCP endpoint.",
    contact: {
      name: "MCP Hub Support",
      url: "https://github.com/mcphub/mcp-hub",
    },
    license: {
      name: "MIT",
      url: "https://opensource.org/licenses/MIT",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
    {
      url: "https://api.mcphub.io",
      description: "Production server",
    },
  ],
  tags: [
    {
      name: "Gateway",
      description: "MCP Gateway endpoints for tool execution",
    },
    {
      name: "API Keys",
      description: "API key management endpoints",
    },
    {
      name: "Health",
      description: "Health check and monitoring endpoints",
    },
    {
      name: "Integrations",
      description: "Integration-specific endpoints",
    },
  ],
  paths: {
    "/api/gateway/health": {
      get: {
        tags: ["Gateway"],
        summary: "Gateway health check",
        description: "Returns the health status of the MCP Gateway",
        responses: {
          "200": {
            description: "Gateway is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: {
                      type: "string",
                      example: "ok",
                    },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/gateway/tools/list": {
      get: {
        tags: ["Gateway"],
        summary: "List available tools",
        description: "Returns all tools available for the authenticated user",
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "List of available tools",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tools: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Tool",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - invalid or missing API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/gateway/tools/call": {
      post: {
        tags: ["Gateway"],
        summary: "Call a tool",
        description: "Executes a tool with the provided arguments",
        security: [
          {
            ApiKeyAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Tool name in format integration/tool_name",
                    example: "github/create_issue",
                  },
                  arguments: {
                    type: "object",
                    description: "Tool-specific arguments",
                    example: {
                      owner: "user",
                      repo: "repo",
                      title: "Bug report",
                      body: "Description of the bug",
                    },
                  },
                },
                required: ["name", "arguments"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            example: "text",
                          },
                          text: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid arguments",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - invalid or missing API key",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "Tool not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "500": {
            description: "Internal server error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/keys": {
      get: {
        tags: ["API Keys"],
        summary: "List API keys",
        description: "Returns all API keys for the authenticated user",
        security: [
          {
            SessionAuth: [],
          },
        ],
        responses: {
          "200": {
            description: "List of API keys",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    keys: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/ApiKey",
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - not logged in",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["API Keys"],
        summary: "Create API key",
        description: "Creates a new API key for the authenticated user",
        security: [
          {
            SessionAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Descriptive name for the API key",
                    example: "Production Key",
                  },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "API key created successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    key: {
                      type: "string",
                      description: "The API key (only shown once)",
                      example: "mcp_sk_1234567890abcdef",
                    },
                    id: {
                      type: "string",
                      description: "The key ID",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - invalid input",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - not logged in",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["API Keys"],
        summary: "Revoke API key",
        description: "Revokes an existing API key",
        security: [
          {
            SessionAuth: [],
          },
        ],
        parameters: [
          {
            name: "id",
            in: "query",
            required: true,
            schema: {
              type: "string",
            },
            description: "The key ID to revoke",
          },
        ],
        responses: {
          "200": {
            description: "API key revoked successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request - missing key ID",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - not logged in",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "404": {
            description: "API key not found",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Application health check",
        description:
          "Returns the health status of the application and its dependencies (Convex, Clerk)",
        responses: {
          "200": {
            description: "All services are healthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthStatus",
                },
              },
            },
          },
          "503": {
            description: "One or more services are unhealthy",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/HealthStatus",
                },
              },
            },
          },
        },
      },
    },
    "/api/integrations/github": {
      post: {
        tags: ["Integrations"],
        summary: "Execute GitHub tool",
        description: "Executes a GitHub integration tool",
        security: [
          {
            OAuthToken: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  tool: {
                    type: "string",
                    description: "Tool name",
                    example: "create_issue",
                  },
                  arguments: {
                    type: "object",
                    description: "Tool arguments",
                    example: {
                      owner: "user",
                      repo: "repo",
                      title: "Bug report",
                      body: "Description",
                    },
                  },
                },
                required: ["tool", "arguments"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tool execution result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    content: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                          },
                          text: {
                            type: "string",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Bad request",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
          "401": {
            description: "Unauthorized - missing or invalid OAuth token",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Error",
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
        description: "MCP Hub API key (format: mcp_sk_xxxxx)",
      },
      SessionAuth: {
        type: "apiKey",
        in: "cookie",
        name: "session",
        description: "Clerk session cookie",
      },
      OAuthToken: {
        type: "apiKey",
        in: "header",
        name: "x-oauth-token",
        description: "OAuth token for the integration",
      },
    },
    schemas: {
      Tool: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Tool name in format integration/tool_name",
            example: "github/create_issue",
          },
          description: {
            type: "string",
            description: "Human-readable description of the tool",
            example: "Create a new GitHub issue",
          },
          inputSchema: {
            type: "object",
            description: "JSON schema for tool arguments",
            additionalProperties: true,
          },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "Unique key identifier",
          },
          name: {
            type: "string",
            description: "Descriptive name",
            example: "Production Key",
          },
          prefix: {
            type: "string",
            description: "First 10 characters of the key",
            example: "mcp_sk_123",
          },
          lastUsed: {
            type: "number",
            description: "Unix timestamp of last use",
            nullable: true,
          },
          _creationTime: {
            type: "number",
            description: "Unix timestamp of creation",
          },
        },
      },
      HealthStatus: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ok", "error"],
            description: "Overall status",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Current timestamp",
          },
          uptime: {
            type: "number",
            description: "Process uptime in seconds",
          },
          environment: {
            type: "string",
            description: "Environment name",
            example: "production",
          },
          services: {
            type: "object",
            properties: {
              api: {
                type: "string",
                enum: ["ok", "error"],
              },
              database: {
                type: "string",
                enum: ["ok", "error"],
                description: "Convex database status",
              },
              auth: {
                type: "string",
                enum: ["ok", "error"],
                description: "Clerk auth status",
              },
            },
          },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "string",
            description: "Error message",
          },
          code: {
            type: "string",
            description: "Error code",
            example: "UNAUTHORIZED",
          },
        },
      },
    },
  },
};

export type OpenAPISpec = typeof openApiSpec;
