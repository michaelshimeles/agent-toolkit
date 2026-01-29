/**
 * MCP JSON-RPC 2.0 Handler
 * Implements the Model Context Protocol for Cursor and other MCP clients
 * 
 * This module wraps the existing REST gateway endpoints in JSON-RPC format
 * so that MCP clients can communicate using the standard protocol.
 */

import { Elysia, t } from "elysia";
import { getConvexClient } from "@/lib/convex";
import { hashApiKey } from "@/lib/encryption";
import { api } from "@/convex/_generated/api";
import {
  anonymizeParams,
  getParamComplexity,
  estimateTokens,
  generateSessionHash,
  categorizeError,
  extractModelId,
  extractClientId,
  getGeoRegion,
  detectRetry,
  detectExecutionMode,
  getSessionCallIndex,
} from "@/lib/analytics-utils";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "mcp-hub";
const SERVER_VERSION = "1.0.0";

// JSON-RPC 2.0 Error Codes
const JSONRPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
};

interface JsonRpcRequest {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  id: string | number | null;
}

/**
 * Get user from API key
 */
async function authenticateUser(apiKey: string | undefined) {
  if (!apiKey) {
    return null;
  }

  const convex = getConvexClient();
  return await convex.query(api.auth.getUserByApiKey, {
    keyHash: hashApiKey(apiKey),
  });
}

/**
 * Get all tools for authenticated user
 */
async function getToolsForUser(userId: string) {
  const convex = getConvexClient();
  const integrations = await convex.query(api.integrations.listUserIntegrations, {
    userId: userId as any,
  });

  return integrations.flatMap((integration: any) =>
    integration?.tools.map((tool: any) => ({
      name: `${integration.slug}/${tool.name}`,
      description: tool.description,
      inputSchema: tool.schema,
    })) ?? []
  );
}

/**
 * Handle initialize method
 */
function handleInitialize(): JsonRpcResponse["result"] {
  return {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
    serverInfo: {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
  };
}

/**
 * Handle tools/list method
 */
async function handleToolsList(userId: string): Promise<JsonRpcResponse["result"]> {
  const tools = await getToolsForUser(userId);
  return { tools };
}

/**
 * Handle tools/call method with anonymous analytics logging
 */
async function handleToolsCall(
  userId: string,
  params: { name: string; arguments?: Record<string, unknown> },
  headers: Headers
): Promise<JsonRpcResponse["result"]> {
  const convex = getConvexClient();
  const { name: toolName, arguments: toolArgs } = params;
  
  // Start timing for latency measurement
  const startTime = Date.now();
  
  // Generate analytics context (anonymous)
  const sessionHash = generateSessionHash(headers);
  const sessionCallIndex = getSessionCallIndex(sessionHash);
  const timestamp = startTime;
  
  // Extract model and client info from headers
  const modelId = extractModelId(headers);
  const clientId = extractClientId(headers);
  const clientVersion = headers.get("x-client-version") || undefined;
  const geoRegion = getGeoRegion(headers);
  
  // Detect execution mode
  const { mode: executionMode, batchId, batchSize } = detectExecutionMode(sessionHash, timestamp);
  
  // Calculate parameter complexity (anonymized)
  const parameterSchema = toolArgs ? anonymizeParams(toolArgs) : undefined;
  const complexity = toolArgs ? getParamComplexity(toolArgs) : { depth: 0, count: 0, maxArrayLength: 0 };
  
  // Estimate input tokens
  const inputTokenEstimate = estimateTokens(toolArgs);

  // Parse integration/tool name
  const slashIndex = toolName.indexOf("/");
  if (slashIndex === -1) {
    throw new Error(`Invalid tool name format: ${toolName}. Expected 'integration/tool'`);
  }

  const integrationSlug = toolName.substring(0, slashIndex);
  const actualToolName = toolName.substring(slashIndex + 1);

  // Variables for analytics
  let status: "success" | "error" | "rate_limited" = "success";
  let errorCategory: string | undefined;
  let result: unknown;
  let hitRateLimit = false;
  let rateLimitType: string | undefined;
  let outputTokenEstimate = 0;

  try {
    // Check if user has this integration enabled
    const connection = await convex.query(api.integrations.getUserConnection, {
      userId: userId as any,
      integrationSlug,
    });

    if (!connection?.enabled) {
      throw new Error(`Integration '${integrationSlug}' is not enabled`);
    }

    // Get integration details
    const integration = await convex.query(api.integrations.getBySlug, {
      slug: integrationSlug,
    });

    if (!integration) {
      throw new Error(`Integration '${integrationSlug}' not found`);
    }

    // Call the integration's function
    const functionUrl = `${process.env.VERCEL_URL || "http://localhost:3000"}${integration.functionPath}`;

    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OAuth-Token": connection.oauthTokenEncrypted || "",
      },
      body: JSON.stringify({
        toolName: actualToolName,
        arguments: toolArgs,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      
      // Check for rate limiting
      if (response.status === 429) {
        status = "rate_limited";
        hitRateLimit = true;
        rateLimitType = response.headers.get("x-ratelimit-type") || "per_minute";
      } else {
        status = "error";
        errorCategory = categorizeError(new Error(error));
      }
      
      throw new Error(error);
    }

    result = await response.json();
    outputTokenEstimate = estimateTokens(result);
    status = "success";

  } catch (error) {
    if (status === "success") {
      status = "error";
      errorCategory = categorizeError(error);
    }
    
    // Detect if this was a retry
    const { isRetry, retryCount } = detectRetry(sessionHash, toolName, true);
    
    // Log analytics even on error
    const latencyMs = Date.now() - startTime;
    
    try {
      await convex.mutation(api.analytics.logToolCall, {
        sessionHash,
        integrationSlug,
        toolName,
        modelId: modelId || undefined,
        clientId: clientId || undefined,
        clientVersion,
        latencyMs,
        status,
        errorCategory,
        inputTokenEstimate,
        outputTokenEstimate: 0,
        isRetry,
        retryCount,
        sessionCallIndex,
        executionMode,
        batchId: batchId || undefined,
        batchSize: batchSize || undefined,
        parameterSchema,
        paramDepth: complexity.depth,
        paramCount: complexity.count,
        arrayMaxLength: complexity.maxArrayLength,
        geoRegion: geoRegion || undefined,
        hitRateLimit,
        rateLimitType,
      });
    } catch (analyticsError) {
      // Don't fail the request if analytics logging fails
      console.error("Failed to log analytics:", analyticsError);
    }
    
    throw error;
  }

  // Calculate final latency
  const latencyMs = Date.now() - startTime;
  
  // Detect retry (successful call)
  const { isRetry, retryCount } = detectRetry(sessionHash, toolName, false);

  // Log anonymous analytics
  try {
    await convex.mutation(api.analytics.logToolCall, {
      sessionHash,
      integrationSlug,
      toolName,
      modelId: modelId || undefined,
      clientId: clientId || undefined,
      clientVersion,
      latencyMs,
      status,
      inputTokenEstimate,
      outputTokenEstimate,
      isRetry,
      retryCount,
      sessionCallIndex,
      executionMode,
      batchId: batchId || undefined,
      batchSize: batchSize || undefined,
      parameterSchema,
      paramDepth: complexity.depth,
      paramCount: complexity.count,
      arrayMaxLength: complexity.maxArrayLength,
      geoRegion: geoRegion || undefined,
      hitRateLimit,
      rateLimitType,
    });
  } catch (analyticsError) {
    // Don't fail the request if analytics logging fails
    console.error("Failed to log analytics:", analyticsError);
  }

  // Return in MCP content format
  return {
    content: [
      {
        type: "text",
        text: typeof result === "string" ? result : JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Handle resources/list method
 */
async function handleResourcesList(userId: string): Promise<JsonRpcResponse["result"]> {
  const convex = getConvexClient();
  const integrations = await convex.query(api.integrations.listUserIntegrations, {
    userId: userId as any,
  });

  const resources = integrations.flatMap((integration: any) =>
    integration?.resources?.map((resource: any) => ({
      uri: resource.uriTemplate,
      name: `${integration.slug} - ${resource.description}`,
      description: resource.description,
      mimeType: "application/json",
    })) ?? []
  );

  return { resources };
}

/**
 * Handle prompts/list method
 */
function handlePromptsList(): JsonRpcResponse["result"] {
  return { prompts: [] };
}

/**
 * Process a single JSON-RPC request
 */
async function processRequest(
  request: JsonRpcRequest,
  user: { _id: string } | null,
  headers: Headers
): Promise<JsonRpcResponse> {
  const id = request.id ?? null;

  // Validate JSON-RPC version
  if (request.jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      error: JSONRPC_ERRORS.INVALID_REQUEST,
      id,
    };
  }

  try {
    let result: unknown;

    switch (request.method) {
      case "initialize":
        result = handleInitialize();
        break;

      case "initialized":
        // Client acknowledgment, no response needed for notifications
        if (id === null || id === undefined) {
          return null as any; // Notification, no response
        }
        result = {};
        break;

      case "tools/list":
        if (!user) {
          return {
            jsonrpc: "2.0",
            error: { code: -32000, message: "Authentication required" },
            id,
          };
        }
        result = await handleToolsList(user._id);
        break;

      case "tools/call":
        if (!user) {
          return {
            jsonrpc: "2.0",
            error: { code: -32000, message: "Authentication required" },
            id,
          };
        }
        if (!request.params?.name) {
          return {
            jsonrpc: "2.0",
            error: JSONRPC_ERRORS.INVALID_PARAMS,
            id,
          };
        }
        result = await handleToolsCall(user._id, request.params as any, headers);
        break;

      case "resources/list":
        if (!user) {
          return {
            jsonrpc: "2.0",
            error: { code: -32000, message: "Authentication required" },
            id,
          };
        }
        result = await handleResourcesList(user._id);
        break;

      case "prompts/list":
        result = handlePromptsList();
        break;

      case "ping":
        result = {};
        break;

      default:
        return {
          jsonrpc: "2.0",
          error: JSONRPC_ERRORS.METHOD_NOT_FOUND,
          id,
        };
    }

    return {
      jsonrpc: "2.0",
      result,
      id,
    };
  } catch (error) {
    console.error(`Error processing MCP request ${request.method}:`, error);
    return {
      jsonrpc: "2.0",
      error: {
        code: JSONRPC_ERRORS.INTERNAL_ERROR.code,
        message: error instanceof Error ? error.message : "Internal error",
      },
      id,
    };
  }
}

/**
 * MCP JSON-RPC Routes
 * Handles both single requests and batch requests
 */
export const mcpRoutes = new Elysia({ prefix: "/mcp" })
  // Main JSON-RPC endpoint
  .post(
    "/",
    async ({ body, headers, request }) => {
      const apiKey = headers["x-api-key"];
      const user = await authenticateUser(apiKey);
      
      // Get the full Headers object for analytics
      const requestHeaders = request.headers;

      // Handle batch requests
      if (Array.isArray(body)) {
        const responses = await Promise.all(
          body.map((req) => processRequest(req as JsonRpcRequest, user, requestHeaders))
        );
        // Filter out null responses (notifications)
        return responses.filter((r) => r !== null);
      }

      // Handle single request
      const response = await processRequest(body as JsonRpcRequest, user, requestHeaders);
      if (response === null) {
        return new Response(null, { status: 204 });
      }
      return response;
    },
    {
      body: t.Union([
        t.Object({
          jsonrpc: t.Literal("2.0"),
          method: t.String(),
          params: t.Optional(t.Any()),
          id: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
        }),
        t.Array(
          t.Object({
            jsonrpc: t.Literal("2.0"),
            method: t.String(),
            params: t.Optional(t.Any()),
            id: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
          })
        ),
      ]),
    }
  )

  // SSE endpoint for streaming (optional, for future use)
  .get("/sse", ({ set }) => {
    set.headers["Content-Type"] = "text/event-stream";
    set.headers["Cache-Control"] = "no-cache";
    set.headers["Connection"] = "keep-alive";

    return new Response(
      new ReadableStream({
        start(controller) {
          // Send initial connection event
          controller.enqueue(
            `data: ${JSON.stringify({ type: "connection", status: "connected" })}\n\n`
          );
        },
      }),
      {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      }
    );
  });

