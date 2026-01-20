import { mutation } from "./_generated/server";

/**
 * Seed initial integrations catalog
 * Run with: npx convex run seed:seedIntegrations
 */
export const seedIntegrations = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if GitHub integration already exists
    const existingGithub = await ctx.db
      .query("integrations")
      .withIndex("by_slug", (q) => q.eq("slug", "github"))
      .first();

    if (existingGithub) {
      console.log("GitHub integration already exists");
      return { message: "Integrations already seeded" };
    }

    // Create GitHub integration
    await ctx.db.insert("integrations", {
      slug: "github",
      name: "GitHub",
      description: "Connect to GitHub to manage repositories, issues, pull requests, and more",
      iconUrl: "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
      category: "developer",
      status: "active",
      functionPath: "/api/integrations/github",
      tools: [
        {
          name: "create_issue",
          description: "Create a new issue in a GitHub repository",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              title: { type: "string", description: "Issue title" },
              body: { type: "string", description: "Issue description" },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Issue labels",
              },
              assignees: {
                type: "array",
                items: { type: "string" },
                description: "Issue assignees",
              },
            },
            required: ["owner", "repo", "title"],
          },
        },
        {
          name: "list_repos",
          description: "List repositories for the authenticated user",
          schema: {
            type: "object",
            properties: {
              sort: {
                type: "string",
                enum: ["created", "updated", "pushed", "full_name"],
                description: "Sort order",
              },
              per_page: { type: "number", description: "Results per page" },
            },
          },
        },
        {
          name: "get_repo",
          description: "Get details of a specific repository",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "list_issues",
          description: "List issues in a repository",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              state: {
                type: "string",
                enum: ["open", "closed", "all"],
                description: "Issue state",
              },
              per_page: { type: "number", description: "Results per page" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "get_issue",
          description: "Get details of a specific issue",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              issue_number: { type: "number", description: "Issue number" },
            },
            required: ["owner", "repo", "issue_number"],
          },
        },
        {
          name: "create_pull_request",
          description: "Create a new pull request",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              title: { type: "string", description: "Pull request title" },
              head: { type: "string", description: "Source branch" },
              base: { type: "string", description: "Target branch" },
              body: { type: "string", description: "Pull request description" },
            },
            required: ["owner", "repo", "title", "head", "base"],
          },
        },
        {
          name: "list_pull_requests",
          description: "List pull requests in a repository",
          schema: {
            type: "object",
            properties: {
              owner: { type: "string", description: "Repository owner" },
              repo: { type: "string", description: "Repository name" },
              state: {
                type: "string",
                enum: ["open", "closed", "all"],
                description: "Pull request state",
              },
              per_page: { type: "number", description: "Results per page" },
            },
            required: ["owner", "repo"],
          },
        },
        {
          name: "search_code",
          description: "Search code across GitHub",
          schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              per_page: { type: "number", description: "Results per page" },
            },
            required: ["query"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "github://repos/{owner}/{repo}",
          description: "Access a GitHub repository",
        },
        {
          uriTemplate: "github://issues/{owner}/{repo}/{number}",
          description: "Access a GitHub issue",
        },
        {
          uriTemplate: "github://pulls/{owner}/{repo}/{number}",
          description: "Access a GitHub pull request",
        },
      ],
    });

    console.log("Successfully seeded GitHub integration");

    // Create Linear integration
    await ctx.db.insert("integrations", {
      slug: "linear",
      name: "Linear",
      description: "Connect to Linear to manage issues, projects, and teams",
      iconUrl: "https://asset.brandfetch.io/idg07X_YNm/id4p8z46H2.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/linear",
      tools: [
        {
          name: "create_issue",
          description: "Create a new issue in Linear",
          schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Issue title" },
              description: { type: "string", description: "Issue description" },
              teamId: { type: "string", description: "Team ID" },
              priority: { type: "number", description: "Priority (0-4)" },
              labelIds: {
                type: "array",
                items: { type: "string" },
                description: "Label IDs",
              },
              assigneeId: { type: "string", description: "Assignee user ID" },
              projectId: { type: "string", description: "Project ID" },
            },
            required: ["title", "teamId"],
          },
        },
        {
          name: "list_issues",
          description: "List issues in Linear",
          schema: {
            type: "object",
            properties: {
              teamId: { type: "string", description: "Filter by team ID" },
              assigneeId: { type: "string", description: "Filter by assignee ID" },
              state: { type: "string", description: "Filter by state name" },
              limit: { type: "number", description: "Maximum number of results" },
            },
          },
        },
        {
          name: "get_issue",
          description: "Get details of a specific Linear issue",
          schema: {
            type: "object",
            properties: {
              issueId: { type: "string", description: "Issue ID" },
            },
            required: ["issueId"],
          },
        },
        {
          name: "update_issue",
          description: "Update a Linear issue",
          schema: {
            type: "object",
            properties: {
              issueId: { type: "string", description: "Issue ID" },
              title: { type: "string", description: "New title" },
              description: { type: "string", description: "New description" },
              priority: { type: "number", description: "New priority" },
              stateId: { type: "string", description: "New state ID" },
              assigneeId: { type: "string", description: "New assignee ID" },
              labelIds: {
                type: "array",
                items: { type: "string" },
                description: "New label IDs",
              },
            },
            required: ["issueId"],
          },
        },
        {
          name: "list_teams",
          description: "List all teams in Linear",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "list_projects",
          description: "List projects in Linear",
          schema: {
            type: "object",
            properties: {
              teamId: { type: "string", description: "Filter by team ID" },
              limit: { type: "number", description: "Maximum number of results" },
            },
          },
        },
        {
          name: "search_issues",
          description: "Search issues in Linear",
          schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              limit: { type: "number", description: "Maximum number of results" },
            },
            required: ["query"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "linear://issue/{issueId}",
          description: "Access a Linear issue",
        },
        {
          uriTemplate: "linear://team/{teamId}",
          description: "Access a Linear team",
        },
        {
          uriTemplate: "linear://project/{projectId}",
          description: "Access a Linear project",
        },
      ],
    });

    console.log("Successfully seeded Linear integration");

    // Create Notion integration
    await ctx.db.insert("integrations", {
      slug: "notion",
      name: "Notion",
      description: "Connect to Notion to manage pages, databases, and content",
      iconUrl: "https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/notion",
      tools: [
        {
          name: "search",
          description: "Search across all pages and databases in Notion",
          schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              filter: {
                type: "object",
                description: "Filter by object type (page or database)",
              },
              sort: {
                type: "object",
                description: "Sort results",
              },
              page_size: { type: "number", description: "Number of results" },
            },
            required: ["query"],
          },
        },
        {
          name: "get_page",
          description: "Get a Notion page by ID",
          schema: {
            type: "object",
            properties: {
              pageId: { type: "string", description: "Page ID" },
            },
            required: ["pageId"],
          },
        },
        {
          name: "get_page_content",
          description: "Get the content blocks of a Notion page",
          schema: {
            type: "object",
            properties: {
              pageId: { type: "string", description: "Page ID" },
              page_size: { type: "number", description: "Number of blocks to retrieve" },
            },
            required: ["pageId"],
          },
        },
        {
          name: "create_page",
          description: "Create a new page in Notion",
          schema: {
            type: "object",
            properties: {
              parent: {
                type: "object",
                description: "Parent page or database",
              },
              properties: {
                type: "object",
                description: "Page properties",
              },
              children: {
                type: "array",
                description: "Content blocks",
              },
            },
            required: ["parent", "properties"],
          },
        },
        {
          name: "update_page",
          description: "Update a Notion page",
          schema: {
            type: "object",
            properties: {
              pageId: { type: "string", description: "Page ID" },
              properties: {
                type: "object",
                description: "Properties to update",
              },
              archived: { type: "boolean", description: "Archive the page" },
            },
            required: ["pageId"],
          },
        },
        {
          name: "query_database",
          description: "Query a Notion database",
          schema: {
            type: "object",
            properties: {
              databaseId: { type: "string", description: "Database ID" },
              filter: {
                type: "object",
                description: "Filter conditions",
              },
              sorts: {
                type: "array",
                description: "Sort conditions",
              },
              page_size: { type: "number", description: "Number of results" },
            },
            required: ["databaseId"],
          },
        },
        {
          name: "get_database",
          description: "Get a Notion database by ID",
          schema: {
            type: "object",
            properties: {
              databaseId: { type: "string", description: "Database ID" },
            },
            required: ["databaseId"],
          },
        },
        {
          name: "create_database",
          description: "Create a new database in Notion",
          schema: {
            type: "object",
            properties: {
              parent: {
                type: "object",
                description: "Parent page",
              },
              title: {
                type: "array",
                description: "Database title",
              },
              properties: {
                type: "object",
                description: "Database schema",
              },
            },
            required: ["parent", "properties"],
          },
        },
        {
          name: "append_block_children",
          description: "Append content blocks to a page or block",
          schema: {
            type: "object",
            properties: {
              blockId: { type: "string", description: "Parent block ID" },
              children: {
                type: "array",
                description: "Blocks to append",
              },
            },
            required: ["blockId", "children"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "notion://page/{pageId}",
          description: "Access a Notion page",
        },
        {
          uriTemplate: "notion://database/{databaseId}",
          description: "Access a Notion database",
        },
        {
          uriTemplate: "notion://block/{blockId}",
          description: "Access a Notion block",
        },
      ],
    });

    console.log("Successfully seeded Notion integration");

    // Create Slack integration
    await ctx.db.insert("integrations", {
      slug: "slack",
      name: "Slack",
      description: "Connect to Slack to manage channels, send messages, and interact with your team",
      iconUrl: "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/slack",
      tools: [
        {
          name: "send_message",
          description: "Send a message to a Slack channel",
          schema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID or name" },
              text: { type: "string", description: "Message text" },
              blocks: {
                type: "array",
                description: "Block Kit blocks",
              },
              thread_ts: {
                type: "string",
                description: "Thread timestamp to reply to",
              },
            },
            required: ["channel", "text"],
          },
        },
        {
          name: "list_channels",
          description: "List all Slack channels",
          schema: {
            type: "object",
            properties: {
              types: {
                type: "string",
                description: "Channel types (comma-separated)",
              },
              limit: { type: "number", description: "Maximum channels" },
            },
          },
        },
        {
          name: "get_channel_history",
          description: "Get message history from a channel",
          schema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID" },
              limit: { type: "number", description: "Number of messages" },
              oldest: { type: "string", description: "Start timestamp" },
              latest: { type: "string", description: "End timestamp" },
            },
            required: ["channel"],
          },
        },
        {
          name: "search_messages",
          description: "Search messages across Slack",
          schema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query" },
              count: { type: "number", description: "Number of results" },
              sort: { type: "string", description: "Sort order" },
              sort_dir: { type: "string", description: "Sort direction" },
            },
            required: ["query"],
          },
        },
        {
          name: "list_users",
          description: "List all Slack users",
          schema: {
            type: "object",
            properties: {
              limit: { type: "number", description: "Maximum users" },
            },
          },
        },
        {
          name: "get_user_info",
          description: "Get information about a specific user",
          schema: {
            type: "object",
            properties: {
              user_id: { type: "string", description: "User ID" },
            },
            required: ["user_id"],
          },
        },
        {
          name: "create_channel",
          description: "Create a new Slack channel",
          schema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Channel name" },
              is_private: { type: "boolean", description: "Private channel" },
            },
            required: ["name"],
          },
        },
        {
          name: "invite_to_channel",
          description: "Invite users to a channel",
          schema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID" },
              users: { type: "string", description: "Comma-separated user IDs" },
            },
            required: ["channel", "users"],
          },
        },
        {
          name: "set_channel_topic",
          description: "Set the topic for a channel",
          schema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID" },
              topic: { type: "string", description: "New topic" },
            },
            required: ["channel", "topic"],
          },
        },
        {
          name: "add_reaction",
          description: "Add a reaction to a message",
          schema: {
            type: "object",
            properties: {
              channel: { type: "string", description: "Channel ID" },
              timestamp: { type: "string", description: "Message timestamp" },
              reaction: { type: "string", description: "Reaction name" },
            },
            required: ["channel", "timestamp", "reaction"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "slack://channel/{channel_id}",
          description: "Access a Slack channel",
        },
        {
          uriTemplate: "slack://user/{user_id}",
          description: "Access a Slack user",
        },
        {
          uriTemplate: "slack://message/{channel_id}/{timestamp}",
          description: "Access a Slack message",
        },
      ],
    });

    console.log("Successfully seeded Slack integration");

    // Create PostgreSQL integration
    await ctx.db.insert("integrations", {
      slug: "postgresql",
      name: "PostgreSQL",
      description: "Connect to PostgreSQL databases for querying, schema inspection, and management",
      iconUrl: "https://www.postgresql.org/media/img/about/press/elephant.png",
      category: "data",
      status: "active",
      functionPath: "/api/integrations/postgresql",
      tools: [
        {
          name: "execute_query",
          description: "Execute a SQL query on the PostgreSQL database",
          schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "SQL query to execute",
              },
              params: {
                type: "array",
                items: { type: "string" },
                description: "Query parameters for parameterized queries",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "list_tables",
          description: "List all tables in a schema",
          schema: {
            type: "object",
            properties: {
              schema: {
                type: "string",
                description: "Schema name (defaults to 'public')",
              },
            },
          },
        },
        {
          name: "describe_table",
          description: "Get detailed information about a table's structure",
          schema: {
            type: "object",
            properties: {
              tableName: {
                type: "string",
                description: "Name of the table to describe",
              },
              schema: {
                type: "string",
                description: "Schema name (defaults to 'public')",
              },
            },
            required: ["tableName"],
          },
        },
        {
          name: "list_schemas",
          description: "List all user-defined schemas in the database",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_table_size",
          description: "Get size information for a specific table",
          schema: {
            type: "object",
            properties: {
              tableName: {
                type: "string",
                description: "Name of the table",
              },
              schema: {
                type: "string",
                description: "Schema name (defaults to 'public')",
              },
            },
            required: ["tableName"],
          },
        },
        {
          name: "list_databases",
          description: "List all databases on the server",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_table_stats",
          description: "Get statistics for a table (row count, dead rows, last vacuum, etc.)",
          schema: {
            type: "object",
            properties: {
              tableName: {
                type: "string",
                description: "Name of the table",
              },
              schema: {
                type: "string",
                description: "Schema name (defaults to 'public')",
              },
            },
            required: ["tableName"],
          },
        },
        {
          name: "list_active_queries",
          description: "List currently active queries on the database",
          schema: {
            type: "object",
            properties: {},
          },
        },
      ],
      resources: [
        {
          uriTemplate: "postgresql://database/{database_name}",
          description: "Access a PostgreSQL database",
        },
        {
          uriTemplate: "postgresql://schema/{schema_name}",
          description: "Access a PostgreSQL schema",
        },
        {
          uriTemplate: "postgresql://table/{schema_name}/{table_name}",
          description: "Access a PostgreSQL table",
        },
      ],
    });

    console.log("Successfully seeded PostgreSQL integration");

    // Google Drive Integration
    await ctx.db.insert("integrations", {
      slug: "google-drive",
      name: "Google Drive",
      description: "Access and manage files and folders in Google Drive",
      iconUrl: "https://www.google.com/drive/static/images/drive/logo-drive.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/google-drive",
      tools: [
        {
          name: "list_files",
          description: "List files in Google Drive with optional query filter",
          schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Google Drive query string (e.g., \"name contains 'report'\")",
              },
              pageSize: {
                type: "number",
                description: "Number of files to return (default: 10)",
              },
              orderBy: {
                type: "string",
                description: "Sort order (default: 'modifiedTime desc')",
              },
            },
          },
        },
        {
          name: "search_files",
          description: "Search for files by name and optionally filter by MIME type",
          schema: {
            type: "object",
            properties: {
              searchTerm: {
                type: "string",
                description: "Search term to find in file names",
              },
              mimeType: {
                type: "string",
                description: "Optional MIME type filter (e.g., 'application/pdf')",
              },
            },
            required: ["searchTerm"],
          },
        },
        {
          name: "get_file",
          description: "Get detailed information about a specific file",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "download_file",
          description: "Download file content from Google Drive",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "create_file",
          description: "Create a new file in Google Drive",
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "File name",
              },
              mimeType: {
                type: "string",
                description: "MIME type of the file",
              },
              content: {
                type: "string",
                description: "File content",
              },
              folderId: {
                type: "string",
                description: "Optional parent folder ID",
              },
            },
            required: ["name", "mimeType", "content"],
          },
        },
        {
          name: "create_folder",
          description: "Create a new folder in Google Drive",
          schema: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Folder name",
              },
              parentFolderId: {
                type: "string",
                description: "Optional parent folder ID",
              },
            },
            required: ["name"],
          },
        },
        {
          name: "update_file",
          description: "Update file metadata (name and/or description)",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
              name: {
                type: "string",
                description: "New file name",
              },
              description: {
                type: "string",
                description: "New file description",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "delete_file",
          description: "Delete a file or folder from Google Drive",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "share_file",
          description: "Share a file with another user",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
              email: {
                type: "string",
                description: "Email address to share with",
              },
              role: {
                type: "string",
                description: "Permission role: reader, writer, commenter, or owner (default: reader)",
                enum: ["reader", "writer", "commenter", "owner"],
              },
              type: {
                type: "string",
                description: "Permission type (default: user)",
              },
            },
            required: ["fileId", "email"],
          },
        },
        {
          name: "export_file",
          description: "Export a Google Workspace file to a different format",
          schema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "Google Drive file ID",
              },
              mimeType: {
                type: "string",
                description: "Export MIME type (e.g., 'application/pdf')",
              },
            },
            required: ["fileId", "mimeType"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "gdrive://file/{fileId}",
          description: "Access a specific file in Google Drive",
        },
        {
          uriTemplate: "gdrive://folder/{folderId}",
          description: "Access a specific folder in Google Drive",
        },
        {
          uriTemplate: "gdrive://search/{query}",
          description: "Search results for a query",
        },
      ],
    });

    console.log("Successfully seeded Google Drive integration");

    // Gmail Integration
    await ctx.db.insert("integrations", {
      slug: "gmail",
      name: "Gmail",
      description: "Read, send, and manage Gmail messages and labels",
      iconUrl: "https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/gmail",
      tools: [
        {
          name: "list_messages",
          description: "List Gmail messages with optional query and label filters",
          schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Gmail query string (e.g., 'is:unread', 'from:user@example.com')",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of messages to return (default: 10)",
              },
              labelIds: {
                type: "array",
                items: { type: "string" },
                description: "Filter by label IDs (e.g., ['INBOX', 'IMPORTANT'])",
              },
            },
          },
        },
        {
          name: "get_message",
          description: "Get a specific Gmail message by ID",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Gmail message ID",
              },
              format: {
                type: "string",
                description: "Message format: full, metadata, minimal, or raw (default: full)",
                enum: ["full", "metadata", "minimal", "raw"],
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "send_message",
          description: "Send a new email message",
          schema: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address",
              },
              subject: {
                type: "string",
                description: "Email subject",
              },
              body: {
                type: "string",
                description: "Email body content (HTML supported)",
              },
              cc: {
                type: "string",
                description: "CC email address (optional)",
              },
              bcc: {
                type: "string",
                description: "BCC email address (optional)",
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "search_messages",
          description: "Search for messages using advanced filters",
          schema: {
            type: "object",
            properties: {
              searchTerm: {
                type: "string",
                description: "Text to search for in messages",
              },
              from: {
                type: "string",
                description: "Filter by sender email",
              },
              to: {
                type: "string",
                description: "Filter by recipient email",
              },
              hasAttachment: {
                type: "boolean",
                description: "Filter messages with attachments",
              },
              after: {
                type: "string",
                description: "Filter messages after date (YYYY/MM/DD)",
              },
              before: {
                type: "string",
                description: "Filter messages before date (YYYY/MM/DD)",
              },
            },
          },
        },
        {
          name: "get_thread",
          description: "Get an email thread (conversation) by ID",
          schema: {
            type: "object",
            properties: {
              threadId: {
                type: "string",
                description: "Gmail thread ID",
              },
              format: {
                type: "string",
                description: "Thread format (default: full)",
                enum: ["full", "metadata", "minimal"],
              },
            },
            required: ["threadId"],
          },
        },
        {
          name: "reply_to_message",
          description: "Reply to an existing message",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "ID of message to reply to",
              },
              body: {
                type: "string",
                description: "Reply body content",
              },
            },
            required: ["messageId", "body"],
          },
        },
        {
          name: "delete_message",
          description: "Permanently delete a message",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Gmail message ID to delete",
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "trash_message",
          description: "Move a message to trash",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Gmail message ID to trash",
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "modify_labels",
          description: "Add or remove labels from a message",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Gmail message ID",
              },
              addLabelIds: {
                type: "array",
                items: { type: "string" },
                description: "Label IDs to add (e.g., ['STARRED', 'IMPORTANT'])",
              },
              removeLabelIds: {
                type: "array",
                items: { type: "string" },
                description: "Label IDs to remove",
              },
            },
            required: ["messageId"],
          },
        },
        {
          name: "list_labels",
          description: "List all Gmail labels for the user",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "create_draft",
          description: "Create a draft email message",
          schema: {
            type: "object",
            properties: {
              to: {
                type: "string",
                description: "Recipient email address",
              },
              subject: {
                type: "string",
                description: "Email subject",
              },
              body: {
                type: "string",
                description: "Email body content",
              },
              cc: {
                type: "string",
                description: "CC email address (optional)",
              },
              bcc: {
                type: "string",
                description: "BCC email address (optional)",
              },
            },
            required: ["to", "subject", "body"],
          },
        },
        {
          name: "get_attachments",
          description: "Get list of attachments from a message",
          schema: {
            type: "object",
            properties: {
              messageId: {
                type: "string",
                description: "Gmail message ID",
              },
            },
            required: ["messageId"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "gmail://message/{messageId}",
          description: "Access a specific Gmail message",
        },
        {
          uriTemplate: "gmail://thread/{threadId}",
          description: "Access a Gmail thread (conversation)",
        },
        {
          uriTemplate: "gmail://label/{labelId}",
          description: "Access messages with a specific label",
        },
      ],
    });

    console.log("Successfully seeded Gmail integration");

    // Jira Integration
    await ctx.db.insert("integrations", {
      slug: "jira",
      name: "Jira",
      description: "Manage Jira issues, projects, and boards for project tracking",
      iconUrl: "https://wac-cdn.atlassian.com/dam/jcr:50e28f85-e69d-4ca9-aed4-102e8e439fce/jira-icon-gradient-blue.svg",
      category: "developer",
      status: "active",
      functionPath: "/api/integrations/jira",
      tools: [
        {
          name: "list_projects",
          description: "List all accessible Jira projects",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_project",
          description: "Get detailed information about a specific project",
          schema: {
            type: "object",
            properties: {
              projectKey: {
                type: "string",
                description: "Project key (e.g., 'PROJ')",
              },
            },
            required: ["projectKey"],
          },
        },
        {
          name: "list_issues",
          description: "Search for issues using JQL (Jira Query Language)",
          schema: {
            type: "object",
            properties: {
              jql: {
                type: "string",
                description: "JQL query string (e.g., 'project = PROJ AND status = Open')",
              },
              maxResults: {
                type: "number",
                description: "Maximum number of results (default: 50)",
              },
              startAt: {
                type: "number",
                description: "Starting index for pagination (default: 0)",
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Fields to include in response",
              },
            },
          },
        },
        {
          name: "get_issue",
          description: "Get detailed information about a specific issue",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key (e.g., 'PROJ-123')",
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Fields to include in response",
              },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "create_issue",
          description: "Create a new Jira issue",
          schema: {
            type: "object",
            properties: {
              projectKey: {
                type: "string",
                description: "Project key",
              },
              summary: {
                type: "string",
                description: "Issue summary/title",
              },
              issueType: {
                type: "string",
                description: "Issue type (e.g., 'Task', 'Bug', 'Story'). Default: 'Task'",
              },
              description: {
                type: "string",
                description: "Issue description",
              },
              priority: {
                type: "string",
                description: "Priority (e.g., 'High', 'Medium', 'Low')",
              },
              assignee: {
                type: "string",
                description: "Assignee account ID",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "Issue labels",
              },
            },
            required: ["projectKey", "summary"],
          },
        },
        {
          name: "update_issue",
          description: "Update an existing issue",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key to update",
              },
              summary: {
                type: "string",
                description: "New summary",
              },
              description: {
                type: "string",
                description: "New description",
              },
              status: {
                type: "string",
                description: "New status (will transition issue)",
              },
              assignee: {
                type: "string",
                description: "New assignee account ID",
              },
              priority: {
                type: "string",
                description: "New priority",
              },
              labels: {
                type: "array",
                items: { type: "string" },
                description: "New labels",
              },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "add_comment",
          description: "Add a comment to an issue",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key",
              },
              comment: {
                type: "string",
                description: "Comment text",
              },
            },
            required: ["issueKey", "comment"],
          },
        },
        {
          name: "get_transitions",
          description: "Get available status transitions for an issue",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key",
              },
            },
            required: ["issueKey"],
          },
        },
        {
          name: "transition_issue",
          description: "Transition an issue to a new status",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key",
              },
              transitionId: {
                type: "string",
                description: "Transition ID (get from get_transitions)",
              },
            },
            required: ["issueKey", "transitionId"],
          },
        },
        {
          name: "assign_issue",
          description: "Assign an issue to a user",
          schema: {
            type: "object",
            properties: {
              issueKey: {
                type: "string",
                description: "Issue key",
              },
              accountId: {
                type: "string",
                description: "User account ID",
              },
            },
            required: ["issueKey", "accountId"],
          },
        },
        {
          name: "search_users",
          description: "Search for Jira users",
          schema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (user name or email)",
              },
              maxResults: {
                type: "number",
                description: "Maximum results (default: 50)",
              },
            },
            required: ["query"],
          },
        },
        {
          name: "get_board",
          description: "Get information about a Jira board",
          schema: {
            type: "object",
            properties: {
              boardId: {
                type: "number",
                description: "Board ID",
              },
            },
            required: ["boardId"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "jira://project/{projectKey}",
          description: "Access a Jira project",
        },
        {
          uriTemplate: "jira://issue/{issueKey}",
          description: "Access a Jira issue",
        },
        {
          uriTemplate: "jira://board/{boardId}",
          description: "Access a Jira board",
        },
      ],
    });

    console.log("Successfully seeded Jira integration");

    // Airtable Integration
    await ctx.db.insert("integrations", {
      slug: "airtable",
      name: "Airtable",
      description: "Manage Airtable bases, tables, and records for data organization",
      iconUrl: "https://airtable.com/images/favicon/baymax/favicon-32x32.png",
      category: "productivity",
      status: "active",
      functionPath: "/api/integrations/airtable",
      tools: [
        {
          name: "list_bases",
          description: "List all accessible Airtable bases",
          schema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_base_schema",
          description: "Get schema information for a base (tables and fields)",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID (e.g., 'appABC123')",
              },
            },
            required: ["baseId"],
          },
        },
        {
          name: "list_records",
          description: "List records from a table with optional filtering and sorting",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              maxRecords: {
                type: "number",
                description: "Maximum number of records (default: 100)",
              },
              view: {
                type: "string",
                description: "View name to use",
              },
              fields: {
                type: "array",
                items: { type: "string" },
                description: "Fields to include in response",
              },
              filterByFormula: {
                type: "string",
                description: "Airtable formula to filter records",
              },
              sort: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    direction: { type: "string", enum: ["asc", "desc"] },
                  },
                },
                description: "Sort configuration",
              },
            },
            required: ["baseId", "tableId"],
          },
        },
        {
          name: "get_record",
          description: "Get a specific record by ID",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              recordId: {
                type: "string",
                description: "Record ID (e.g., 'recABC123')",
              },
            },
            required: ["baseId", "tableId", "recordId"],
          },
        },
        {
          name: "create_record",
          description: "Create a new record in a table",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              fields: {
                type: "object",
                description: "Record fields as key-value pairs",
              },
            },
            required: ["baseId", "tableId", "fields"],
          },
        },
        {
          name: "create_records",
          description: "Create multiple records in a table (up to 10 at once)",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              records: {
                type: "array",
                items: { type: "object" },
                description: "Array of field objects to create",
              },
            },
            required: ["baseId", "tableId", "records"],
          },
        },
        {
          name: "update_record",
          description: "Update a record (partial update)",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              recordId: {
                type: "string",
                description: "Record ID",
              },
              fields: {
                type: "object",
                description: "Fields to update",
              },
            },
            required: ["baseId", "tableId", "recordId", "fields"],
          },
        },
        {
          name: "update_records",
          description: "Update multiple records (up to 10 at once)",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              records: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    fields: { type: "object" },
                  },
                },
                description: "Array of records with id and fields",
              },
            },
            required: ["baseId", "tableId", "records"],
          },
        },
        {
          name: "delete_record",
          description: "Delete a single record",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              recordId: {
                type: "string",
                description: "Record ID to delete",
              },
            },
            required: ["baseId", "tableId", "recordId"],
          },
        },
        {
          name: "delete_records",
          description: "Delete multiple records (up to 10 at once)",
          schema: {
            type: "object",
            properties: {
              baseId: {
                type: "string",
                description: "Base ID",
              },
              tableId: {
                type: "string",
                description: "Table ID or name",
              },
              recordIds: {
                type: "array",
                items: { type: "string" },
                description: "Array of record IDs to delete",
              },
            },
            required: ["baseId", "tableId", "recordIds"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "airtable://base/{baseId}",
          description: "Access an Airtable base",
        },
        {
          uriTemplate: "airtable://base/{baseId}/table/{tableId}",
          description: "Access an Airtable table",
        },
        {
          uriTemplate: "airtable://base/{baseId}/table/{tableId}/record/{recordId}",
          description: "Access an Airtable record",
        },
      ],
    });

    console.log("Successfully seeded Airtable integration");

    // Stripe Integration
    await ctx.db.insert("integrations", {
      slug: "stripe",
      name: "Stripe",
      description: "Manage Stripe customers, invoices, subscriptions, and payments",
      iconUrl: "https://stripe.com/img/v3/home/social.png",
      category: "payments",
      status: "active",
      functionPath: "/api/integrations/stripe",
      tools: [
        {
          name: "list_customers",
          description: "List Stripe customers with pagination",
          schema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of customers to return (default: 10)",
              },
              starting_after: {
                type: "string",
                description: "Customer ID for pagination",
              },
              email: {
                type: "string",
                description: "Filter by email address",
              },
            },
          },
        },
        {
          name: "get_customer",
          description: "Get a specific customer by ID",
          schema: {
            type: "object",
            properties: {
              customerId: {
                type: "string",
                description: "Customer ID (e.g., 'cus_ABC123')",
              },
            },
            required: ["customerId"],
          },
        },
        {
          name: "create_customer",
          description: "Create a new Stripe customer",
          schema: {
            type: "object",
            properties: {
              email: {
                type: "string",
                description: "Customer email",
              },
              name: {
                type: "string",
                description: "Customer name",
              },
              description: {
                type: "string",
                description: "Customer description",
              },
              metadata: {
                type: "object",
                description: "Custom metadata",
              },
            },
          },
        },
        {
          name: "update_customer",
          description: "Update an existing customer",
          schema: {
            type: "object",
            properties: {
              customerId: {
                type: "string",
                description: "Customer ID",
              },
              email: {
                type: "string",
                description: "New email",
              },
              name: {
                type: "string",
                description: "New name",
              },
              description: {
                type: "string",
                description: "New description",
              },
              metadata: {
                type: "object",
                description: "Updated metadata",
              },
            },
            required: ["customerId"],
          },
        },
        {
          name: "list_invoices",
          description: "List invoices with optional filters",
          schema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of invoices to return (default: 10)",
              },
              customer: {
                type: "string",
                description: "Filter by customer ID",
              },
              status: {
                type: "string",
                description: "Filter by status (draft, open, paid, void, uncollectible)",
                enum: ["draft", "open", "paid", "void", "uncollectible"],
              },
            },
          },
        },
        {
          name: "get_invoice",
          description: "Get a specific invoice by ID",
          schema: {
            type: "object",
            properties: {
              invoiceId: {
                type: "string",
                description: "Invoice ID (e.g., 'in_ABC123')",
              },
            },
            required: ["invoiceId"],
          },
        },
        {
          name: "list_subscriptions",
          description: "List subscriptions with optional filters",
          schema: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of subscriptions to return (default: 10)",
              },
              customer: {
                type: "string",
                description: "Filter by customer ID",
              },
              status: {
                type: "string",
                description: "Filter by status (active, past_due, canceled, incomplete, trialing)",
                enum: ["active", "past_due", "canceled", "incomplete", "trialing"],
              },
            },
          },
        },
        {
          name: "get_subscription",
          description: "Get a specific subscription by ID",
          schema: {
            type: "object",
            properties: {
              subscriptionId: {
                type: "string",
                description: "Subscription ID (e.g., 'sub_ABC123')",
              },
            },
            required: ["subscriptionId"],
          },
        },
        {
          name: "cancel_subscription",
          description: "Cancel a subscription",
          schema: {
            type: "object",
            properties: {
              subscriptionId: {
                type: "string",
                description: "Subscription ID to cancel",
              },
            },
            required: ["subscriptionId"],
          },
        },
        {
          name: "list_payment_methods",
          description: "List payment methods for a customer",
          schema: {
            type: "object",
            properties: {
              customer: {
                type: "string",
                description: "Customer ID",
              },
              type: {
                type: "string",
                description: "Payment method type (default: card)",
                enum: ["card", "us_bank_account", "sepa_debit"],
              },
              limit: {
                type: "number",
                description: "Number of payment methods to return (default: 10)",
              },
            },
            required: ["customer"],
          },
        },
        {
          name: "create_payment_intent",
          description: "Create a payment intent for processing a payment",
          schema: {
            type: "object",
            properties: {
              amount: {
                type: "number",
                description: "Amount in cents (e.g., 2000 for $20.00)",
              },
              currency: {
                type: "string",
                description: "Currency code (default: usd)",
              },
              customer: {
                type: "string",
                description: "Customer ID",
              },
              description: {
                type: "string",
                description: "Payment description",
              },
              metadata: {
                type: "object",
                description: "Custom metadata",
              },
            },
            required: ["amount"],
          },
        },
        {
          name: "create_refund",
          description: "Create a refund for a payment",
          schema: {
            type: "object",
            properties: {
              payment_intent: {
                type: "string",
                description: "Payment intent ID to refund",
              },
              amount: {
                type: "number",
                description: "Amount to refund in cents (omit for full refund)",
              },
              reason: {
                type: "string",
                description: "Refund reason",
                enum: ["duplicate", "fraudulent", "requested_by_customer"],
              },
            },
            required: ["payment_intent"],
          },
        },
      ],
      resources: [
        {
          uriTemplate: "stripe://customer/{customerId}",
          description: "Access a Stripe customer",
        },
        {
          uriTemplate: "stripe://invoice/{invoiceId}",
          description: "Access a Stripe invoice",
        },
        {
          uriTemplate: "stripe://subscription/{subscriptionId}",
          description: "Access a Stripe subscription",
        },
        {
          uriTemplate: "stripe://payment_intent/{paymentIntentId}",
          description: "Access a Stripe payment intent",
        },
      ],
    });

    console.log("Successfully seeded Stripe integration");
    return { message: "All 10 integrations seeded successfully: GitHub, Linear, Notion, Slack, PostgreSQL, Google Drive, Gmail, Jira, Airtable, and Stripe" };
  },
});
