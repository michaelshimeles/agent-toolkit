/**
 * Main Elysia Server
 * Combines all API routes into a single unified Elysia application
 */

  import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { healthRoutes } from "./health";
import { docsRoutes } from "./docs";
import { keysRoutes } from "./keys";
import { gatewayRoutes } from "./gateway";
import { oauthRoutes } from "./oauth";
import { webhooksRoutes } from "./webhooks";
import { mcpRoutes } from "./mcp";
import { settingsRoutes } from "./settings";

export const app = new Elysia({ prefix: "/api" })
  // Swagger documentation
  .use(
    swagger({
      path: "/swagger",
      documentation: {
        info: {
          title: "MCP Hub API",
          version: "1.0.0",
          description: "API for managing MCP servers and integrations",
        },
        tags: [
          { name: "Health", description: "Health check endpoints" },
          { name: "Keys", description: "API key management" },
          { name: "Gateway", description: "MCP gateway for tools and resources" },
          { name: "OAuth", description: "OAuth authentication flows" },
          { name: "Webhooks", description: "External webhook handlers" },
        ],
      },
    })
  )
  // Root endpoint
  .get("/", () => ({
    message: "Welcome to MCP Hub API",
    version: "1.0.0",
    docs: "/api/swagger",
  }))
  // Mount all route modules
  .use(healthRoutes)
  .use(docsRoutes)
  .use(keysRoutes)
  .use(gatewayRoutes)
  .use(oauthRoutes)
  .use(webhooksRoutes)
  .use(mcpRoutes)
  .use(settingsRoutes);

// Export the app type for Eden
export type App = typeof app;

