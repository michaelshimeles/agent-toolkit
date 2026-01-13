/**
 * MCP Chat API Route
 * Uses AI SDK with Anthropic to create a chat interface for testing MCP tools
 */

import { streamText, tool, UIMessage, createUIMessageStreamResponse, createUIMessageStream } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { getConvexClient } from "@/lib/convex";
import { hashApiKey } from "@/lib/encryption";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, apiKey, deploymentUrl } = body as {
      messages: UIMessage[];
      apiKey: string;
      deploymentUrl: string;
    };

    // Validate API key
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!deploymentUrl) {
      return new Response(
        JSON.stringify({ error: "Deployment URL is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate API key exists in database
    const convex = getConvexClient();
    const apiKeyUser = await convex.query(api.auth.getUserByApiKey, {
      keyHash: hashApiKey(apiKey),
    });

    if (!apiKeyUser) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch available tools from the deployed MCP server
    let serverTools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

    try {
      const toolsResponse = await fetch(`${deploymentUrl}/tools/list`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (toolsResponse.ok) {
        const data = await toolsResponse.json();
        serverTools = data.tools || [];
      }
    } catch (error) {
      console.error("Failed to fetch tools from server:", error);
    }

    // Convert MCP tools to AI SDK tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiTools: Record<string, any> = {};

    for (const mcpTool of serverTools) {
      const toolName = mcpTool.name.replace(/[^a-zA-Z0-9_]/g, "_");
      
      // Create a Zod schema from the inputSchema
      const schema = mcpTool.inputSchema as {
        type?: string;
        properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
        required?: string[];
      };
      
      // Build zod schema dynamically
      const zodProps: Record<string, z.ZodTypeAny> = {};
      
      if (schema.properties) {
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          let zodType: z.ZodTypeAny;
          
          if (propDef.enum && Array.isArray(propDef.enum)) {
            zodType = z.enum(propDef.enum as [string, ...string[]]);
          } else {
            switch (propDef.type) {
              case "number":
              case "integer":
                zodType = z.number();
                break;
              case "boolean":
                zodType = z.boolean();
                break;
              case "array":
                zodType = z.array(z.any());
                break;
              case "object":
                zodType = z.record(z.string(), z.any());
                break;
              default:
                zodType = z.string();
            }
          }
          
          if (propDef.description) {
            zodType = zodType.describe(propDef.description);
          }
          
          // Make optional if not in required array
          if (!schema.required?.includes(propName)) {
            zodType = zodType.optional();
          }
          
          zodProps[propName] = zodType;
        }
      }

      aiTools[toolName] = tool({
        description: mcpTool.description || `Execute ${mcpTool.name}`,
        inputSchema: z.object(zodProps),
        execute: async (args: Record<string, unknown>) => {
          try {
            const response = await fetch(`${deploymentUrl}/tools/call`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
              },
              body: JSON.stringify({
                name: mcpTool.name,
                arguments: args,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              return { error: errorText, status: response.status };
            }

            return await response.json();
          } catch (error) {
            return {
              error: error instanceof Error ? error.message : "Tool execution failed",
            };
          }
        },
      });
    }

    // Create system prompt
    const systemPrompt = `You are a helpful AI assistant that can use MCP (Model Context Protocol) tools to help users accomplish tasks.

You have access to the following tools from the deployed MCP server:
${serverTools.map((t) => `- ${t.name}: ${t.description}`).join("\n")}

When the user asks you to do something that requires using a tool, use the appropriate tool and explain the results clearly.

Be concise but informative in your responses. When showing tool results, format them nicely for readability.`;

    // Convert UIMessages to the format expected by streamText
    const modelMessages = messages.map((msg) => {
      const textParts = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");
      
      return {
        role: msg.role as "user" | "assistant" | "system",
        content: textParts,
      };
    });

    // Stream the response using the new UIMessage format
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = streamText({
          model: anthropic("claude-sonnet-4-20250514"),
          system: systemPrompt,
          messages: modelMessages,
          tools: aiTools,
        });

        // Merge the result stream into the writer
        writer.merge(result.toUIMessageStream());
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("MCP chat error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
