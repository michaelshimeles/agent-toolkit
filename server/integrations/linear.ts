/**
 * Linear MCP Integration
 * Provides tools for working with Linear issues, projects, and cycles
 */

import { Elysia, t } from "elysia";
import { LinearClient } from "@linear/sdk";

export const linearRoutes = new Elysia({ prefix: "/linear" }).post(
  "/",
  async ({ body, headers }) => {
    const token = headers["x-oauth-token"];

    if (!token) {
      return new Response("Missing OAuth token", { status: 401 });
    }

    const linear = new LinearClient({ accessToken: token });
    const { toolName, arguments: args } = body as { toolName: string; arguments?: any };

    try {
      switch (toolName) {
        case "create_issue": {
          const issue = await linear.createIssue({
            title: args.title,
            description: args.description,
            teamId: args.teamId,
            priority: args.priority,
            labelIds: args.labelIds,
            assigneeId: args.assigneeId,
            projectId: args.projectId,
          });

          return {
            content: [
              {
                type: "text",
                text: `Created Linear issue: ${(issue.issue as any)?.identifier} - ${(issue.issue as any)?.title}\nURL: ${(issue.issue as any)?.url}`,
              },
            ],
          };
        }

        case "list_issues": {
          const issues = await linear.issues({
            filter: {
              team: args.teamId ? { id: { eq: args.teamId } } : undefined,
              assignee: args.assigneeId
                ? { id: { eq: args.assigneeId } }
                : undefined,
              state: args.state ? { name: { eq: args.state } } : undefined,
            },
            first: args.limit || 50,
          });

          const issueList = issues.nodes
            .map(
              (issue: any) =>
                `- ${issue.identifier}: ${issue.title} (${issue.state?.name}) - ${issue.url}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Linear Issues:\n${issueList || "No issues found"}`,
              },
            ],
          };
        }

        case "get_issue": {
          const issue = await linear.issue(args.issueId);

          if (!issue) {
            return {
              content: [
                {
                  type: "text",
                  text: `Issue ${args.issueId} not found`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `Issue: ${(issue as any).identifier} - ${(issue as any).title}\nStatus: ${(issue as any).state?.name}\nAssignee: ${(issue as any).assignee?.name || "Unassigned"}\nPriority: ${(issue as any).priority}\nDescription:\n${(issue as any).description || "No description"}\nURL: ${(issue as any).url}`,
              },
            ],
          };
        }

        case "update_issue": {
          const update = await linear.updateIssue(args.issueId, {
            title: args.title,
            description: args.description,
            priority: args.priority,
            stateId: args.stateId,
            assigneeId: args.assigneeId,
            labelIds: args.labelIds,
          });

          return {
            content: [
              {
                type: "text",
                text: `Updated issue: ${(update.issue as any)?.identifier}`,
              },
            ],
          };
        }

        case "list_teams": {
          const teams = await linear.teams();

          const teamList = teams.nodes
            .map(
              (team) =>
                `- ${team.name} (${team.key}) - ${team.description || "No description"}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Linear Teams:\n${teamList}`,
              },
            ],
          };
        }

        case "list_projects": {
          const projects = await linear.projects({
            filter: args.teamId
              ? ({ team: { id: { eq: args.teamId } } } as any)
              : undefined,
            first: args.limit || 50,
          });

          const projectList = projects.nodes
            .map(
              (project) =>
                `- ${project.name} (${project.state}) - ${project.description || "No description"}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Linear Projects:\n${projectList || "No projects found"}`,
              },
            ],
          };
        }

        case "search_issues": {
          const issues = await linear.searchIssues(args.query, {
            first: args.limit || 20,
          });

          const issueList = issues.nodes
            .map(
              (issue: any) =>
                `- ${issue.identifier}: ${issue.title} (${issue.state?.name}) - ${issue.url}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Search Results:\n${issueList || "No issues found"}`,
              },
            ],
          };
        }

        default:
          return new Response(`Unknown tool: ${toolName}`, { status: 400 });
      }
    } catch (error) {
      console.error("Linear API error:", error);
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

