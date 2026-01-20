/**
 * MCP Gateway Module
 * Provides endpoints for MCP tools, resources, and prompts
 */

import { Elysia, t } from "elysia";
import { getConvexClient } from "@/lib/convex";
import { hashApiKey, parseNamespace } from "@/lib/encryption";
import { api } from "@/convex/_generated/api";
import {
  decryptToken,
  isTokenExpired,
  refreshAccessToken,
  encryptToken,
  getGitHubOAuthConfig,
  getLinearOAuthConfig,
  getNotionOAuthConfig,
  getSlackOAuthConfig,
  type OAuthConfig,
} from "@/lib/oauth";

/**
 * Get OAuth config for a given integration
 */
function getOAuthConfig(integrationSlug: string): OAuthConfig | null {
  switch (integrationSlug) {
    case "github":
      return getGitHubOAuthConfig();
    case "linear":
      return getLinearOAuthConfig();
    case "notion":
      return getNotionOAuthConfig();
    case "slack":
      return getSlackOAuthConfig();
    default:
      return null;
  }
}

/**
 * Get valid OAuth access token, refreshing if expired
 */
async function getValidAccessToken(
  convex: any,
  connection: any,
  integrationSlug: string
): Promise<string> {
  if (!connection.oauthTokenEncrypted) {
    throw new Error("No OAuth token found for this integration");
  }

  const token = decryptToken(connection.oauthTokenEncrypted);
  const issuedAt = connection.tokenIssuedAt || Date.now();

  if (!isTokenExpired(token, issuedAt)) {
    return token.access_token;
  }

  if (!token.refresh_token) {
    throw new Error("OAuth token expired and no refresh token available");
  }

  const oauthConfig = getOAuthConfig(integrationSlug);
  if (!oauthConfig) {
    throw new Error(`OAuth config not found for ${integrationSlug}`);
  }

  const newToken = await refreshAccessToken(oauthConfig, token.refresh_token);
  const encryptedNewToken = encryptToken(newToken);

  await convex.mutation(api.integrations.enableIntegration, {
    userId: connection.userId,
    integrationId: connection.integrationId,
    oauthTokenEncrypted: encryptedNewToken,
    tokenIssuedAt: Date.now(),
  });

  return newToken.access_token;
}

export const gatewayRoutes = new Elysia({ prefix: "/gateway" })
  // Health check endpoint
  .get("/health", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }))

  // List available tools endpoint
  .get("/tools/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];

    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    try {
      const convex = getConvexClient();

      const user = await convex.query(api.auth.getUserByApiKey, {
        keyHash: hashApiKey(apiKey),
      });

      if (!user) {
        return new Response("Invalid API key", { status: 401 });
      }

      const integrations = await convex.query(
        api.integrations.listUserIntegrations,
        { userId: user._id }
      );

      const tools = integrations.flatMap((integration: any) =>
        integration?.tools.map((tool: any) => ({
          name: `${integration.slug}/${tool.name}`,
          description: tool.description,
          inputSchema: tool.schema,
        })) ?? []
      );

      return { tools };
    } catch (error) {
      console.error("Error listing tools:", error);
      return new Response("Internal server error", { status: 500 });
    }
  })

  // Call a tool endpoint
  .post(
    "/tools/call",
    async ({ body, headers }) => {
      const apiKey = headers["x-api-key"];

      if (!apiKey) {
        return new Response("Missing API key", { status: 401 });
      }

      try {
        const convex = getConvexClient();

        const user = await convex.query(api.auth.getUserByApiKey, {
          keyHash: hashApiKey(apiKey),
        });

        if (!user) {
          return new Response("Invalid API key", { status: 401 });
        }

        const { name: toolName, arguments: toolArgs } = body as { name: string; arguments?: any };
        const [integrationSlug, actualToolName] = parseNamespace(toolName);

        const connection = await convex.query(
          api.integrations.getUserConnection,
          {
            userId: user._id,
            integrationSlug,
          }
        );

        if (!connection?.enabled) {
          return new Response(
            `Integration '${integrationSlug}' is not enabled`,
            { status: 403 }
          );
        }

        const integration = await convex.query(api.integrations.getBySlug, {
          slug: integrationSlug,
        });

        if (!integration) {
          return new Response(`Integration '${integrationSlug}' not found`, {
            status: 404,
          });
        }

        let accessToken = "";
        if (connection.oauthTokenEncrypted) {
          try {
            accessToken = await getValidAccessToken(
              convex,
              connection,
              integrationSlug
            );
          } catch (error) {
            return new Response(
              `OAuth token error: ${error instanceof Error ? error.message : "Unknown error"}`,
              { status: 401 }
            );
          }
        }

        const functionUrl = `${process.env.VERCEL_URL || "http://localhost:3000"}${integration.functionPath}`;
        const startTime = Date.now();

        const response = await fetch(functionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-OAuth-Token": accessToken,
          },
          body: JSON.stringify({
            toolName: actualToolName,
            arguments: toolArgs,
          }),
        });

        const latency = Date.now() - startTime;

        await convex.mutation(api.usage.log, {
          userId: user._id,
          integrationId: integration._id,
          toolName: actualToolName,
          latencyMs: latency,
          status: response.ok ? "success" : "error",
        });

        if (!response.ok) {
          const error = await response.text();
          return new Response(error, { status: response.status });
        }

        return await response.json();
      } catch (error) {
        console.error("Error calling tool:", error);
        return new Response(
          error instanceof Error ? error.message : "Internal server error",
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        name: t.String(),
        arguments: t.Optional(t.Any()),
      }),
    }
  )

  // List available resources endpoint
  .get("/resources/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];

    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    try {
      const convex = getConvexClient();

      const user = await convex.query(api.auth.getUserByApiKey, {
        keyHash: hashApiKey(apiKey),
      });

      if (!user) {
        return new Response("Invalid API key", { status: 401 });
      }

      const integrations = await convex.query(
        api.integrations.listUserIntegrations,
        { userId: user._id }
      );

      const resources = integrations.flatMap((integration: any) =>
        integration?.resources?.map((resource: any) => ({
          uri: resource.uriTemplate,
          name: `${integration.slug} - ${resource.description}`,
          description: resource.description,
          mimeType: "application/json",
        })) ?? []
      );

      return { resources };
    } catch (error) {
      console.error("Error listing resources:", error);
      return new Response("Internal server error", { status: 500 });
    }
  })

  // Read a resource endpoint
  .post(
    "/resources/read",
    async ({ body, headers }) => {
      const apiKey = headers["x-api-key"];

      if (!apiKey) {
        return new Response("Missing API key", { status: 401 });
      }

      try {
        const convex = getConvexClient();

        const user = await convex.query(api.auth.getUserByApiKey, {
          keyHash: hashApiKey(apiKey),
        });

        if (!user) {
          return new Response("Invalid API key", { status: 401 });
        }

        const { uri } = body as { uri: string };

        const uriMatch = uri.match(/^(\w+):\/\//);
        if (!uriMatch) {
          return new Response("Invalid resource URI format", { status: 400 });
        }

        const integrationSlug = uriMatch[1];

        const connection = await convex.query(
          api.integrations.getUserConnection,
          {
            userId: user._id,
            integrationSlug,
          }
        );

        if (!connection?.enabled) {
          return new Response(
            `Integration '${integrationSlug}' is not enabled`,
            { status: 403 }
          );
        }

        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: `Resource read not yet implemented for ${integrationSlug}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error reading resource:", error);
        return new Response(
          error instanceof Error ? error.message : "Internal server error",
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        uri: t.String(),
      }),
    }
  )

  // List available prompts endpoint
  .get("/prompts/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];

    if (!apiKey) {
      return new Response("Missing API key", { status: 401 });
    }

    try {
      const convex = getConvexClient();

      const user = await convex.query(api.auth.getUserByApiKey, {
        keyHash: hashApiKey(apiKey),
      });

      if (!user) {
        return new Response("Invalid API key", { status: 401 });
      }

      return { prompts: [] };
    } catch (error) {
      console.error("Error listing prompts:", error);
      return new Response("Internal server error", { status: 500 });
    }
  })

  // Get a specific prompt endpoint
  .post(
    "/prompts/get",
    async ({ body, headers }) => {
      const apiKey = headers["x-api-key"];

      if (!apiKey) {
        return new Response("Missing API key", { status: 401 });
      }

      try {
        const convex = getConvexClient();

        const user = await convex.query(api.auth.getUserByApiKey, {
          keyHash: hashApiKey(apiKey),
        });

        if (!user) {
          return new Response("Invalid API key", { status: 401 });
        }

        const { name } = body as { name: string; arguments?: any };

        return {
          description: `Prompt '${name}' not found`,
          messages: [],
        };
      } catch (error) {
        console.error("Error getting prompt:", error);
        return new Response(
          error instanceof Error ? error.message : "Internal server error",
          { status: 500 }
        );
      }
    },
    {
      body: t.Object({
        name: t.String(),
        arguments: t.Optional(t.Any()),
      }),
    }
  );

