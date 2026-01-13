/**
 * Claude API Integration
 * Provides utilities for calling Claude API for code generation
 */

import Anthropic from "@anthropic-ai/sdk";

// Initialize Claude client
let claudeClient: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    claudeClient = new Anthropic({ apiKey });
  }
  return claudeClient;
}

/**
 * Parse JSON from Claude response, handling markdown code blocks
 */
export function parseClaudeJSON<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try direct JSON parsing first
  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // Look for JSON object in the response (skip any preceding text)
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through to next attempt
      }
    }

    // Try to find any JSON-like structure (object or array)
    const anyJsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (anyJsonMatch) {
      try {
        return JSON.parse(anyJsonMatch[1]);
      } catch {
        // Fall through to error
      }
    }

    throw new Error(
      `Failed to parse Claude response as JSON: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      `Response started with: ${text.slice(0, 100)}...`
    );
  }
}

/**
 * System prompts for different code generation tasks
 */
export const PROMPTS = {
  GENERATE_MCP_FROM_OPENAPI: `You are an expert at building MCP (Model Context Protocol) servers.
You will be given an OpenAPI specification and need to generate a complete MCP server implementation.

Your task:
1. Analyze the OpenAPI spec and identify all relevant endpoints
2. Generate MCP tool definitions for each endpoint
3. Implement REAL API calls using fetch() to the actual API endpoints
4. Use TypeScript with strict types
5. Follow MCP protocol specifications exactly - using JSON-RPC 2.0

CRITICAL: MCP Protocol Requirements
The server MUST implement JSON-RPC 2.0 protocol for MCP compatibility with clients like Cursor, Claude Desktop, etc.
- All MCP methods are called via POST to the root endpoint (/)
- Each request has: { "jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1 }
- Required methods: initialize, initialized, tools/list, tools/call, ping
- The X-API-Key header validates the user's identity (check for tools/list and tools/call)

CRITICAL: REAL API IMPLEMENTATIONS
- You MUST generate real fetch() calls to the actual API endpoints
- Use the baseUrl from the OpenAPI spec (servers[0].url) as the base for all API calls
- NEVER return placeholder text like "Result" - always make real HTTP requests
- Handle authentication by accepting apiKey or token parameters in tools
- Parse and return the actual API response data

Generate clean, production-ready code that:
- Uses Elysia framework for the HTTP server
- Implements JSON-RPC 2.0 protocol for MCP
- Makes REAL fetch() calls to the actual API
- Validates X-API-Key header for authenticated methods
- Includes comprehensive error handling
- Has clear, descriptive tool names and descriptions
- Returns MCP-formatted responses with real data

The code structure MUST be:
\`\`\`typescript
import { Elysia, t } from "elysia";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "API Name MCP Server";
const SERVER_VERSION = "1.0.0";
const BASE_URL = "https://api.example.com"; // From OpenAPI spec servers[0].url

const TOOLS = [
  { name: "tool_name", description: "Description", inputSchema: { type: "object", properties: {}, required: [] } }
];

async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "list_items": {
      // REAL implementation - make actual API call
      const response = await fetch(\`\${BASE_URL}/items\`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(args.apiKey && { "Authorization": \`Bearer \${args.apiKey}\` }),
        },
      });
      if (!response.ok) {
        throw new Error(\`API error: \${response.status} \${response.statusText}\`);
      }
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    case "create_item": {
      // REAL implementation with POST body
      const response = await fetch(\`\${BASE_URL}/items\`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(args.apiKey && { "Authorization": \`Bearer \${args.apiKey}\` }),
        },
        body: JSON.stringify({ name: args.name, description: args.description }),
      });
      if (!response.ok) {
        throw new Error(\`API error: \${response.status} \${response.statusText}\`);
      }
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
}

const JSONRPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
};

const app = new Elysia()
  .get("/", () => ({ status: "ok", timestamp: new Date().toISOString(), service: SERVER_NAME }))
  
  .post("/", async ({ body, headers }) => {
    const request = body as any;
    const id = request.id ?? null;
    
    if (request.jsonrpc !== "2.0") {
      return { jsonrpc: "2.0", error: JSONRPC_ERRORS.INVALID_REQUEST, id };
    }
    
    try {
      switch (request.method) {
        case "initialize":
          return { jsonrpc: "2.0", result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: SERVER_NAME, version: SERVER_VERSION } }, id };
        case "initialized":
        case "ping":
          return { jsonrpc: "2.0", result: {}, id };
        case "tools/list": {
          if (!headers["x-api-key"]) return { jsonrpc: "2.0", error: { code: -32000, message: "Authentication required" }, id };
          return { jsonrpc: "2.0", result: { tools: TOOLS }, id };
        }
        case "tools/call": {
          if (!headers["x-api-key"]) return { jsonrpc: "2.0", error: { code: -32000, message: "Authentication required" }, id };
          const { name, arguments: args } = request.params || {};
          if (!name) return { jsonrpc: "2.0", error: JSONRPC_ERRORS.INVALID_PARAMS, id };
          const result = await handleToolCall(name, args || {});
          return { jsonrpc: "2.0", result, id };
        }
        default:
          return { jsonrpc: "2.0", error: JSONRPC_ERRORS.METHOD_NOT_FOUND, id };
      }
    } catch (error: any) {
      return { jsonrpc: "2.0", error: { code: -32603, message: error.message || "Internal error" }, id };
    }
  }, { body: t.Object({ jsonrpc: t.String(), method: t.String(), params: t.Optional(t.Any()), id: t.Optional(t.Union([t.String(), t.Number(), t.Null()])) }) })
  
  // REST fallback endpoints
  .get("/tools/list", async ({ headers }) => {
    if (!headers["x-api-key"]) return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
    return { tools: TOOLS };
  })
  .post("/tools/call", async ({ body, headers }) => {
    if (!headers["x-api-key"]) return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const { name, arguments: args } = body as any;
    return await handleToolCall(name, args || {});
  }, { body: t.Object({ name: t.String(), arguments: t.Optional(t.Any()) }) });

export const GET = app.handle;
export const POST = app.handle;
\`\`\`

CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no introductory text, no markdown formatting.
Your entire response must be a valid JSON object starting with { and ending with }.

Return ONLY this JSON structure:
{
  "code": "// Full TypeScript implementation with JSON-RPC 2.0...",
  "tools": [
    {
      "name": "tool_name",
      "description": "Clear description", 
      "schema": { /* JSON schema */ }
    }
  ]
}`,

  GENERATE_MCP_FROM_DOCS: `You are an expert at analyzing API documentation and building MCP (Model Context Protocol) servers.
You will be given HTML/text from API documentation and need to:

1. Extract ALL API endpoints, their HTTP methods, URL patterns, query parameters, headers, and request/response bodies
2. Identify the authentication method (API key, Bearer token, OAuth, etc.) and where credentials should be sent (header, query param, etc.)
3. Generate comprehensive MCP tool definitions for EACH endpoint
4. Create a complete, working MCP server implementation using JSON-RPC 2.0 protocol

CRITICAL: MCP Protocol Requirements
The server MUST implement JSON-RPC 2.0 protocol for MCP compatibility with clients like Cursor, Claude Desktop, etc.
- All MCP methods are called via POST to the root endpoint (/)
- Each request has: { "jsonrpc": "2.0", "method": "...", "params": {...}, "id": 1 }
- Required methods: initialize, initialized, tools/list, tools/call, ping

AUTHENTICATION:
- The X-API-Key header contains the user's MCP Hub API key
- Check headers["x-api-key"] for tools/list and tools/call methods (not initialize)
- The underlying service's API key (if any) should be passed in tool arguments

IMPORTANT GUIDELINES:
- Create a separate tool for each distinct API operation
- Each tool MUST have proper input validation
- Include all required AND optional parameters from the documentation
- If the underlying API needs an API key, accept it as a parameter (e.g., "apiKey")
- Format responses in a human-readable way for the AI assistant
- Include proper error handling

Generate clean, production-ready TypeScript code using Elysia framework.

The code structure MUST be:
\`\`\`typescript
import { Elysia, t } from "elysia";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "API Name MCP Server";
const SERVER_VERSION = "1.0.0";

// Define your tools here
const TOOLS = [
  {
    name: "tool_name",
    description: "Tool description",
    inputSchema: { type: "object", properties: { /* ... */ }, required: [] }
  }
];

// Helper function to get stored API keys
async function getStoredApiKey(serviceName: string): Promise<string | null> {
  // This will be replaced with actual key retrieval during deployment
  const storedKeys = process.env.STORED_API_KEYS ? JSON.parse(process.env.STORED_API_KEYS) : {};
  return storedKeys[serviceName] || null;
}

// Tool implementations
async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case "tool_name": {
      // Get API key from stored credentials or request parameter
      const apiKey = args.apiKey || await getStoredApiKey("SERVICE_NAME");
      if (!apiKey) {
        throw new Error("API key required. Please configure your API key in MCP server settings.");
      }
      const response = await fetch(\`https://api.example.com/endpoint?param=\${args.param}&appid=\${apiKey}\`);
      if (!response.ok) throw new Error(\`API error: \${response.statusText}\`);
      const data = await response.json();
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
    default:
      throw new Error(\`Unknown tool: \${name}\`);
  }
}

// JSON-RPC error codes
const JSONRPC_ERRORS = {
  PARSE_ERROR: { code: -32700, message: "Parse error" },
  INVALID_REQUEST: { code: -32600, message: "Invalid Request" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
};

const app = new Elysia()
  // Health check (GET /)
  .get("/", () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: SERVER_NAME,
  }))
  
  // MCP JSON-RPC endpoint (POST /)
  .post("/", async ({ body, headers }) => {
    const request = body as any;
    const id = request.id ?? null;
    
    if (request.jsonrpc !== "2.0") {
      return { jsonrpc: "2.0", error: JSONRPC_ERRORS.INVALID_REQUEST, id };
    }
    
    try {
      switch (request.method) {
        case "initialize":
          return {
            jsonrpc: "2.0",
            result: {
              protocolVersion: PROTOCOL_VERSION,
              capabilities: { tools: {} },
              serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
            },
            id,
          };
          
        case "initialized":
          return { jsonrpc: "2.0", result: {}, id };
          
        case "ping":
          return { jsonrpc: "2.0", result: {}, id };
          
        case "tools/list": {
          const apiKey = headers["x-api-key"];
          if (!apiKey) {
            return { jsonrpc: "2.0", error: { code: -32000, message: "Authentication required. Include X-API-Key header." }, id };
          }
          return { jsonrpc: "2.0", result: { tools: TOOLS }, id };
        }
        
        case "tools/call": {
          const apiKey = headers["x-api-key"];
          if (!apiKey) {
            return { jsonrpc: "2.0", error: { code: -32000, message: "Authentication required. Include X-API-Key header." }, id };
          }
          const { name, arguments: args } = request.params || {};
          if (!name) {
            return { jsonrpc: "2.0", error: JSONRPC_ERRORS.INVALID_PARAMS, id };
          }
          const result = await handleToolCall(name, args || {});
          return { jsonrpc: "2.0", result, id };
        }
        
        default:
          return { jsonrpc: "2.0", error: JSONRPC_ERRORS.METHOD_NOT_FOUND, id };
      }
    } catch (error: any) {
      return {
        jsonrpc: "2.0",
        error: { code: JSONRPC_ERRORS.INTERNAL_ERROR.code, message: error.message || "Internal error" },
        id,
      };
    }
  }, {
    body: t.Object({
      jsonrpc: t.String(),
      method: t.String(),
      params: t.Optional(t.Any()),
      id: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
    }),
  })
  
  // REST fallback endpoints for backward compatibility
  .get("/tools/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    return { tools: TOOLS };
  })
  
  .post("/tools/call", async ({ body, headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }
    const { name, arguments: args } = body as any;
    return await handleToolCall(name, args || {});
  }, {
    body: t.Object({ name: t.String(), arguments: t.Optional(t.Any()) }),
  });

export const GET = app.handle;
export const POST = app.handle;
\`\`\`

CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no introductory text, no markdown formatting.
Your entire response must be a valid JSON object starting with { and ending with }.

Return ONLY this JSON structure:
{
  "name": "API Name (e.g., OpenWeather Current Weather API)",
  "description": "Clear description of what this API does",
  "endpoints": [
    {
      "path": "/weather",
      "method": "GET",
      "operationId": "get_current_weather",
      "summary": "Get current weather data",
      "description": "Retrieves current weather data for a specific location",
      "parameters": [
        { "name": "lat", "type": "number", "required": true, "description": "Latitude" },
        { "name": "lon", "type": "number", "required": true, "description": "Longitude" }
      ]
    }
  ],
  "code": "// Full TypeScript implementation with JSON-RPC 2.0...",
  "tools": [
    {
      "name": "get_current_weather",
      "description": "Get current weather data for a location by latitude and longitude",
      "schema": {
        "type": "object",
        "properties": {
          "lat": { "type": "number", "description": "Latitude of the location" },
          "lon": { "type": "number", "description": "Longitude of the location" },
          "units": { "type": "string", "enum": ["standard", "metric", "imperial"], "description": "Units of measurement" }
        },
        "required": ["lat", "lon"]
      }
    }
  ],
  "requiresExternalApiKey": false,
  "externalApiService": null,
  "externalApiKeyUrl": null,
  "externalApiKeyInstructions": null
}

CRITICAL: 
1. The server MUST implement JSON-RPC 2.0 protocol for MCP compatibility
2. The "tools" array must contain ALL tools with complete JSON schemas
3. Each tool needs name, description, and schema with properties and required fields
4. Include both JSON-RPC and REST endpoints for maximum compatibility

EXTERNAL API KEY REQUIREMENT:
If this API requires external API keys (like OpenWeatherMap, Twitter API, etc.), you MUST:
1. Set "requiresExternalApiKey": true in the response
2. Specify "externalApiService" (e.g., "OpenWeatherMap", "Twitter API")
3. Provide "externalApiKeyUrl" (where users can get the key)
4. Include "externalApiKeyInstructions" with clear setup steps
5. Make the apiKey parameter OPTIONAL in the tool schema (it will be auto-populated from stored credentials)

Example for weather APIs:
{
  "requiresExternalApiKey": true,
  "externalApiService": "OpenWeatherMap",
  "externalApiKeyUrl": "https://openweathermap.org/api",
  "externalApiKeyInstructions": "1. Sign up at https://openweathermap.org/api\n2. Get your free API key\n3. The key will be automatically stored and used"
}`,

  GENERATE_DOCS: `You are a technical documentation expert. Generate clear, comprehensive documentation for this MCP server.

Include:
1. Overview and purpose
2. Authentication instructions
3. Available tools with examples
4. Common use cases
5. Troubleshooting tips

Format as markdown. Be concise but thorough.`,

  ANALYZE_GITHUB_REPO: `You are a code analysis expert. Analyze this codebase and extract the API surface.

Your task is to analyze the provided code files and identify all REST API endpoints, gRPC services, CLI commands, or any other interface that external clients can interact with.

Look for:
1. HTTP route definitions (e.g., router.GET, app.post, @app.route, http.HandleFunc)
2. API endpoint handlers and controllers
3. OpenAPI/Swagger specifications if present
4. gRPC service definitions (.proto files or generated code)
5. CLI command definitions
6. Request/response data structures
7. Authentication requirements

CRITICAL - FIND THE BASE URL:
- Look for the production API URL in documentation, README files, config files, or code comments
- Check for environment variables like API_URL, BASE_URL, API_ENDPOINT
- Look for hardcoded URLs in fetch/request calls
- Check package.json, setup.py, or similar for homepage/repository URLs
- If this is a known service (like Daytona, Stripe, etc.), use their official API URL
- Common patterns: "https://api.{service}.com", "https://{service}.io/api"
- The baseUrl is ESSENTIAL for generating working API calls

Handle different languages:
- Go: Look for http.HandleFunc, gorilla/mux, gin, echo, chi routers
- Python: Look for Flask, FastAPI, Django routes
- TypeScript/JavaScript: Look for Express, Fastify, Next.js API routes
- Java: Look for Spring @RequestMapping, JAX-RS annotations
- Rust: Look for actix-web, rocket routes

IMPORTANT: If the code doesn't appear to be a web API, identify what kind of interface it provides (CLI, library, SDK, etc.) and document those interfaces instead.

Return as JSON (you MUST return valid JSON):
{
  "name": "API/Service Name",
  "baseUrl": "https://api.example.com (REQUIRED - the actual production API URL)",
  "authMethod": "bearer|apikey|oauth|none|unknown",
  "description": "Brief description of what this service does",
  "endpoints": [
    {
      "path": "/endpoint or command name",
      "method": "GET|POST|PUT|DELETE|CLI|RPC",
      "description": "What this endpoint/command does",
      "parameters": [
        { "name": "param", "type": "string", "required": true, "description": "..." }
      ],
      "response": { "description": "What it returns" }
    }
  ]
}

If you cannot identify any API endpoints, return a JSON with an empty endpoints array and explain in the description field what the codebase appears to be.`,
};

/**
 * Generate MCP server code from OpenAPI specification
 */
export async function generateMCPFromOpenAPI(spec: any): Promise<{
  code: string;
  tools: Array<{ name: string; description: string; schema: any }>;
}> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.GENERATE_MCP_FROM_OPENAPI}\n\nOpenAPI Spec:\n${JSON.stringify(spec, null, 2)}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse the JSON response (handles markdown code blocks)
  const result = parseClaudeJSON<{ code: string; tools?: Array<{ name: string; description: string; schema: any }> }>(textContent.text);
  return {
    code: result.code,
    tools: result.tools || [],
  };
}

/**
 * Generate MCP server code from OpenAPI specification with streaming
 */
export async function* generateMCPFromOpenAPIStream(spec: any): AsyncGenerator<string, void, unknown> {
  const client = getClaudeClient();

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.GENERATE_MCP_FROM_OPENAPI}\n\nOpenAPI Spec:\n${JSON.stringify(spec, null, 2)}`,
      },
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      yield chunk.delta.text;
    }
  }
}

/**
 * Generate MCP server from documentation
 */
export async function generateMCPFromDocs(docsHtml: string, url: string): Promise<{
  name: string;
  description: string;
  endpoints: any[];
  code: string;
  tools: any[];
}> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.GENERATE_MCP_FROM_DOCS}\n\nDocumentation URL: ${url}\n\nContent:\n${docsHtml.slice(0, 50000)}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseClaudeJSON<{
    name: string;
    description: string;
    endpoints: any[];
    code: string;
    tools: any[];
  }>(textContent.text);
}

/**
 * Generate MCP server from documentation with streaming
 */
export async function* generateMCPFromDocsStream(docsHtml: string, url: string): AsyncGenerator<string, void, unknown> {
  const client = getClaudeClient();

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.GENERATE_MCP_FROM_DOCS}\n\nDocumentation URL: ${url}\n\nContent:\n${docsHtml.slice(0, 50000)}`,
      },
    ],
  });

  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      yield chunk.delta.text;
    }
  }
}

/**
 * Analyze GitHub repository
 */
export async function analyzeGitHubRepo(files: Array<{ path: string; content: string }>): Promise<{
  name: string;
  baseUrl: string;
  authMethod: string;
  endpoints: any[];
}> {
  const client = getClaudeClient();

  const filesContent = files
    .map((f) => `// ${f.path}\n${f.content}`)
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.ANALYZE_GITHUB_REPO}\n\nCode files:\n${filesContent.slice(0, 50000)}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return parseClaudeJSON<{
    name: string;
    baseUrl: string;
    authMethod: string;
    endpoints: any[];
  }>(textContent.text);
}

/**
 * Generate documentation for MCP server
 */
export async function generateDocumentation(
  code: string,
  tools: any[]
): Promise<{
  readme: string;
  toolDocs: Array<{
    name: string;
    description: string;
    params: string;
    example: string;
  }>;
}> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `${PROMPTS.GENERATE_DOCS}\n\nServer Code:\n${code.slice(0, 10000)}\n\nTools:\n${JSON.stringify(tools, null, 2)}`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const readme = textContent.text;

  // Generate individual tool docs
  const toolDocs = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    params: JSON.stringify(tool.schema, null, 2),
    example: `// Example usage\nconst result = await ${tool.name}({ /* parameters */ });`,
  }));

  return {
    readme,
    toolDocs,
  };
}

/**
 * Validate and self-heal generated code
 */
export async function validateAndFixCode(
  code: string,
  errors: string[]
): Promise<string> {
  const client = getClaudeClient();

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: `You are a code debugging expert. Fix the following TypeScript code based on these errors:

Errors:
${errors.join("\n")}

Code:
${code}

Return only the fixed code, nothing else.`,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textContent.text;
}
