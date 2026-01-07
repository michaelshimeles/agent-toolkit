/**
 * Notion MCP Integration
 * Provides tools for working with Notion pages, databases, and search
 */

import { Elysia, t } from "elysia";
import { Client } from "@notionhq/client";

export const notionRoutes = new Elysia({ prefix: "/notion" }).post(
  "/",
  async ({ body, headers }) => {
    const token = headers["x-oauth-token"];

    if (!token) {
      return new Response("Missing OAuth token", { status: 401 });
    }

    const notion = new Client({ auth: token });
    const { toolName, arguments: args } = body as { toolName: string; arguments?: any };

    try {
      switch (toolName) {
        case "search": {
          const response = await notion.search({
            query: args.query,
            filter: args.filter,
            sort: args.sort,
            page_size: args.page_size || 100,
          });

          const results = response.results
            .map((item: any) => {
              if (item.object === "page") {
                const title =
                  item.properties?.title?.title?.[0]?.plain_text ||
                  item.properties?.Name?.title?.[0]?.plain_text ||
                  "Untitled";
                return `- Page: ${title} (${item.id})`;
              } else if (item.object === "database") {
                const title = item.title?.[0]?.plain_text || "Untitled Database";
                return `- Database: ${title} (${item.id})`;
              }
              return `- ${item.object}: ${item.id}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Search Results (${response.results.length} found):\n${results || "No results found"}`,
              },
            ],
          };
        }

        case "get_page": {
          const page = await notion.pages.retrieve({ page_id: args.pageId });

          return {
            content: [
              {
                type: "text",
                text: `Page retrieved: ${args.pageId}\nObject: ${page.object}\nCreated: ${(page as any).created_time}`,
              },
            ],
          };
        }

        case "get_page_content": {
          const blocks = await notion.blocks.children.list({
            block_id: args.pageId,
            page_size: args.page_size || 100,
          });

          const content = blocks.results
            .map((block: any) => {
              const type = block.type;
              const text = block[type]?.rich_text?.[0]?.plain_text || "";
              return `[${type}] ${text}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Page Content:\n${content || "No content blocks found"}`,
              },
            ],
          };
        }

        case "create_page": {
          const response = await notion.pages.create({
            parent: args.parent,
            properties: args.properties,
            children: args.children,
          });

          return {
            content: [
              {
                type: "text",
                text: `Created page: ${response.id}\nURL: ${(response as any).url}`,
              },
            ],
          };
        }

        case "update_page": {
          const response = await notion.pages.update({
            page_id: args.pageId,
            properties: args.properties,
            archived: args.archived,
          });

          return {
            content: [
              {
                type: "text",
                text: `Updated page: ${response.id}`,
              },
            ],
          };
        }

        case "query_database": {
          const response = await (notion.databases as any).query({
            database_id: args.databaseId,
            filter: args.filter,
            sorts: args.sorts,
            page_size: args.page_size || 100,
          });

          const results = response.results
            .map((page: any) => {
              const props = Object.entries(page.properties)
                .map(([key, value]: [string, any]) => {
                  if (value.type === "title" && value.title?.[0]) {
                    return `${key}: ${value.title[0].plain_text}`;
                  }
                  if (value.type === "rich_text" && value.rich_text?.[0]) {
                    return `${key}: ${value.rich_text[0].plain_text}`;
                  }
                  return `${key}: [${value.type}]`;
                })
                .join(", ");
              return `- ${page.id}: ${props}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Database Query Results (${response.results.length} found):\n${results || "No results found"}`,
              },
            ],
          };
        }

        case "get_database": {
          const database = await notion.databases.retrieve({
            database_id: args.databaseId,
          });

          const title =
            (database as any).title?.[0]?.plain_text || "Untitled Database";
          const properties = Object.keys((database as any).properties).join(
            ", "
          );

          return {
            content: [
              {
                type: "text",
                text: `Database: ${title}\nID: ${database.id}\nProperties: ${properties}`,
              },
            ],
          };
        }

        case "create_database": {
          const response = await notion.databases.create({
            parent: args.parent,
            title: args.title,
            properties: args.properties,
          } as any);

          return {
            content: [
              {
                type: "text",
                text: `Created database: ${response.id}\nURL: ${(response as any).url}`,
              },
            ],
          };
        }

        case "append_block_children": {
          const response = await notion.blocks.children.append({
            block_id: args.blockId,
            children: args.children,
          });

          return {
            content: [
              {
                type: "text",
                text: `Appended ${response.results.length} blocks to ${args.blockId}`,
              },
            ],
          };
        }

        default:
          return new Response(`Unknown tool: ${toolName}`, { status: 400 });
      }
    } catch (error) {
      console.error("Notion API error:", error);
      return new Response(
        error instanceof Error ? error.message : "Internal server error",
        { status: 500 }
      );
    }
  },
  {
    body: t.Object({
      toolName: t.String(),
      arguments: t.Optional(t.Any()),
    }),
  }
);

