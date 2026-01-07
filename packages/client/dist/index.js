#!/usr/bin/env node
/**
 * MCP Hub Client
 *
 * This client connects Claude Desktop (or any MCP client) to the MCP Hub platform.
 * It proxies MCP requests to the MCP Hub gateway with API key authentication.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { program } from "commander";
import fetch from "node-fetch";
// Parse command line arguments
program
    .name("mcphub-client")
    .description("MCP Hub client for connecting to the MCP Hub platform")
    .version("0.1.0")
    .requiredOption("--token <token>", "MCP Hub API key (starts with mcp_sk_)")
    .option("--gateway-url <url>", "MCP Hub gateway URL", "https://mcp-app-store.vercel.app/api/gateway")
    .parse();
const options = program.opts();
// Validate API key format
if (!options.token.startsWith("mcp_sk_")) {
    console.error("Error: API key must start with 'mcp_sk_'");
    process.exit(1);
}
const API_KEY = options.token;
const GATEWAY_URL = options.gatewayUrl;
// Create MCP server
const server = new Server({
    name: "mcphub-client",
    version: "0.1.0",
}, {
    capabilities: {
        tools: {},
        resources: {},
        prompts: {},
    },
});
// Helper function to make authenticated requests to the gateway
async function gatewayRequest(endpoint, body) {
    const url = `${GATEWAY_URL}${endpoint}`;
    try {
        const response = await fetch(url, {
            method: body ? "POST" : "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gateway error (${response.status}): ${errorText}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error(`Error calling gateway at ${url}:`, error);
        throw error;
    }
}
// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
        const data = await gatewayRequest("/tools/list");
        return {
            tools: data.tools || [],
        };
    }
    catch (error) {
        console.error("Error listing tools:", error);
        return { tools: [] };
    }
});
// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const result = await gatewayRequest("/tools/call", {
            name: request.params.name,
            arguments: request.params.arguments,
        });
        return {
            content: result.content || [],
            isError: result.isError || false,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error calling tool: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});
// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
        const data = await gatewayRequest("/resources/list");
        return {
            resources: data.resources || [],
        };
    }
    catch (error) {
        console.error("Error listing resources:", error);
        return { resources: [] };
    }
});
// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
        const result = await gatewayRequest("/resources/read", {
            uri: request.params.uri,
        });
        return {
            contents: result.contents || [],
        };
    }
    catch (error) {
        return {
            contents: [
                {
                    uri: request.params.uri,
                    mimeType: "text/plain",
                    text: `Error reading resource: ${error.message}`,
                },
            ],
        };
    }
});
// List prompts handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
        const data = await gatewayRequest("/prompts/list");
        return {
            prompts: data.prompts || [],
        };
    }
    catch (error) {
        console.error("Error listing prompts:", error);
        return { prompts: [] };
    }
});
// Get prompt handler
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
        const result = await gatewayRequest("/prompts/get", {
            name: request.params.name,
            arguments: request.params.arguments,
        });
        return {
            description: result.description || "",
            messages: result.messages || [],
        };
    }
    catch (error) {
        return {
            description: `Error: ${error.message}`,
            messages: [],
        };
    }
});
// Start the server with stdio transport
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Log to stderr (stdout is used for MCP protocol)
    console.error("MCP Hub client started");
    console.error(`Gateway: ${GATEWAY_URL}`);
    console.error(`API Key: ${API_KEY.substring(0, 12)}...`);
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map