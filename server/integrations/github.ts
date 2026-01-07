/**
 * GitHub Integration
 * Provides MCP tools for GitHub repositories, issues, and pull requests
 */

import { Elysia, t } from "elysia";
import { Octokit } from "@octokit/rest";

export const githubRoutes = new Elysia({ prefix: "/github" }).post(
  "/",
  async ({ body, headers }) => {
    const token = headers["x-oauth-token"];

    if (!token) {
      return new Response("Missing OAuth token", { status: 401 });
    }

    const octokit = new Octokit({ auth: token });
    const { toolName, arguments: args } = body as { toolName: string; arguments?: any };

    try {
      switch (toolName) {
        case "create_issue": {
          const issue = await octokit.issues.create({
            owner: args.owner,
            repo: args.repo,
            title: args.title,
            body: args.body,
            labels: args.labels,
            assignees: args.assignees,
          });

          return {
            content: [
              {
                type: "text",
                text: `Created issue #${issue.data.number}: ${issue.data.html_url}`,
              },
            ],
          };
        }

        case "list_repos": {
          const repos = await octokit.repos.listForAuthenticatedUser({
            sort: args.sort || "updated",
            per_page: args.per_page || 30,
          });

          const repoList = repos.data
            .map(
              (repo) =>
                `- ${repo.full_name} (${repo.visibility}) - ${repo.description || "No description"}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${repos.data.length} repositories:\n${repoList}`,
              },
            ],
          };
        }

        case "get_repo": {
          const repo = await octokit.repos.get({
            owner: args.owner,
            repo: args.repo,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(repo.data, null, 2),
              },
            ],
          };
        }

        case "list_issues": {
          const issues = await octokit.issues.listForRepo({
            owner: args.owner,
            repo: args.repo,
            state: args.state || "open",
            per_page: args.per_page || 30,
          });

          const issueList = issues.data
            .map(
              (issue) => `- #${issue.number}: ${issue.title} (${issue.state})`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${issues.data.length} issues:\n${issueList}`,
              },
            ],
          };
        }

        case "get_issue": {
          const issue = await octokit.issues.get({
            owner: args.owner,
            repo: args.repo,
            issue_number: args.issue_number,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(issue.data, null, 2),
              },
            ],
          };
        }

        case "create_pull_request": {
          const pr = await octokit.pulls.create({
            owner: args.owner,
            repo: args.repo,
            title: args.title,
            head: args.head,
            base: args.base,
            body: args.body,
          });

          return {
            content: [
              {
                type: "text",
                text: `Created pull request #${pr.data.number}: ${pr.data.html_url}`,
              },
            ],
          };
        }

        case "list_pull_requests": {
          const prs = await octokit.pulls.list({
            owner: args.owner,
            repo: args.repo,
            state: args.state || "open",
            per_page: args.per_page || 30,
          });

          const prList = prs.data
            .map((pr) => `- #${pr.number}: ${pr.title} (${pr.state})`)
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${prs.data.length} pull requests:\n${prList}`,
              },
            ],
          };
        }

        case "search_code": {
          const results = await octokit.search.code({
            q: args.query,
            per_page: args.per_page || 30,
          });

          const codeList = results.data.items
            .map((item) => `- ${item.repository.full_name}:${item.path}`)
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Found ${results.data.total_count} code results:\n${codeList}`,
              },
            ],
          };
        }

        default:
          return new Response(`Unknown tool: ${toolName}`, { status: 400 });
      }
    } catch (error) {
      console.error("GitHub API error:", error);
      return new Response(
        error instanceof Error ? error.message : "Unknown error",
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

