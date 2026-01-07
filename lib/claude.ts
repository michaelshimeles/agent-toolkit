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

  try {
    return JSON.parse(jsonStr);
  } catch (error) {
    // Try to find JSON object or array in the response
    const jsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
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
3. Implement proper error handling and validation
4. Use TypeScript with strict types
5. Follow MCP protocol specifications exactly

CRITICAL AUTHENTICATION REQUIREMENT:
All MCP servers MUST validate the X-API-Key header for authentication. This is the user's MCP Hub API key.
- Check for headers["x-api-key"] at the start of every handler
- Return 401 Unauthorized if the key is missing
- The API key validates the user's identity for MCP Hub

Generate clean, production-ready code that:
- Uses Elysia framework for the HTTP server
- ALWAYS validates X-API-Key header for authentication
- Includes comprehensive error handling
- Has clear, descriptive tool names and descriptions
- Returns MCP-formatted responses

The code structure MUST include API key validation:
\`\`\`typescript
import { Elysia, t } from "elysia";

const app = new Elysia()
  // Health check (public)
  .get("/", () => ({ status: "ok", timestamp: new Date().toISOString() }))
  
  // List tools (requires API key)
  .get("/tools/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401 });
    }
    return { tools: [...] };
  })
  
  // Call tool (requires API key)
  .post("/tools/call", async ({ body, headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), { status: 401 });
    }
    // Tool implementation...
  }, { body: t.Object({ name: t.String(), arguments: t.Optional(t.Any()) }) });

export const GET = app.handle;
export const POST = app.handle;
\`\`\`

Return the code as a JSON object with this structure:
{
  "code": "// Full TypeScript implementation with API key validation...",
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
4. Create a complete, working MCP server implementation

CRITICAL AUTHENTICATION REQUIREMENT:
All MCP servers MUST validate the X-API-Key header for MCP Hub authentication.
- This is SEPARATE from any API keys needed for the underlying service
- The X-API-Key header contains the user's MCP Hub API key
- You must check headers["x-api-key"] and return 401 if missing
- The underlying service's API key (if any) should be passed via headers["x-service-api-key"] or in the tool arguments

IMPORTANT GUIDELINES:
- Create a separate tool for each distinct API operation (e.g., "get_current_weather", "get_forecast", "search_locations")
- Each tool MUST have proper input validation using Elysia's type system
- Include all required AND optional parameters from the documentation
- If the underlying API needs an API key, accept it as a parameter (e.g., "serviceApiKey" or "apiKey")
- Format responses in a human-readable way for the AI assistant
- Include proper error handling for common failure cases

Generate clean, production-ready TypeScript code using Elysia framework.

The code structure MUST be:
\`\`\`typescript
import { Elysia, t } from "elysia";

const app = new Elysia()
  // Health check endpoint (public)
  .get("/", () => ({
    status: "ok",
    server: "API Name MCP Server",
    timestamp: new Date().toISOString(),
  }))
  
  // List available tools (requires MCP Hub API key)
  .get("/tools/list", async ({ headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key. Include X-API-Key header with your MCP Hub API key." }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }
    
    return {
      tools: [
        {
          name: "tool_name",
          description: "Tool description",
          inputSchema: { type: "object", properties: {...}, required: [...] }
        }
      ]
    };
  })
  
  // Execute a tool (requires MCP Hub API key)
  .post("/tools/call", async ({ body, headers }) => {
    const apiKey = headers["x-api-key"];
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key. Include X-API-Key header with your MCP Hub API key." }), { 
        status: 401, headers: { "Content-Type": "application/json" } 
      });
    }
    
    const { name, arguments: args } = body as any;
    
    switch (name) {
      case "tool_name": {
        // Get service API key from args if needed
        const serviceApiKey = args.apiKey || headers["x-service-api-key"];
        
        const response = await fetch(\`https://api.example.com/endpoint?param=\${args.param}&appid=\${serviceApiKey}\`);
        if (!response.ok) {
          return new Response(JSON.stringify({ error: \`API error: \${response.statusText}\` }), { 
            status: response.status, headers: { "Content-Type": "application/json" } 
          });
        }
        
        const data = await response.json();
        return {
          content: [{
            type: "text",
            text: \`Formatted result: ...\`
          }]
        };
      }
      
      default:
        return new Response(JSON.stringify({ error: \`Unknown tool: \${name}\` }), { 
          status: 404, headers: { "Content-Type": "application/json" } 
        });
    }
  }, {
    body: t.Object({
      name: t.String(),
      arguments: t.Optional(t.Any()),
    }),
  });

export const GET = app.handle;
export const POST = app.handle;
\`\`\`

Return the result as a JSON object with this EXACT structure:
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
  "code": "// Full TypeScript implementation with API key validation...",
  "tools": [
    {
      "name": "get_current_weather",
      "description": "Get current weather data for a location by latitude and longitude",
      "schema": {
        "type": "object",
        "properties": {
          "lat": { "type": "number", "description": "Latitude of the location" },
          "lon": { "type": "number", "description": "Longitude of the location" },
          "units": { "type": "string", "enum": ["standard", "metric", "imperial"], "description": "Units of measurement" },
          "apiKey": { "type": "string", "description": "OpenWeather API key (if not set in headers)" }
        },
        "required": ["lat", "lon"]
      }
    }
  ]
}

CRITICAL: 
1. The "tools" array must contain ALL tools with complete JSON schemas for their parameters
2. Each tool needs name, description, and schema with properties and required fields
3. The generated code MUST validate X-API-Key header for MCP Hub authentication`,

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
  "baseUrl": "https://... or null if not identifiable",
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
