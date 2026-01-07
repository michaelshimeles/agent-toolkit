/**
 * Jira Integration
 * Provides MCP tools for managing Jira issues, projects, and boards
 */

import { Elysia, t } from "elysia";

// Helper function for issue transitions
async function transitionIssue(
  baseUrl: string,
  authString: string,
  issueKey: string,
  statusName: string
) {
  const transitionsResponse = await fetch(
    `${baseUrl}/issue/${issueKey}/transitions`,
    {
      headers: {
        Authorization: `Basic ${authString}`,
        Accept: "application/json",
      },
    }
  );

  if (!transitionsResponse.ok) {
    throw new Error("Failed to get transitions");
  }

  const transitionsData = await transitionsResponse.json();
  const transition = transitionsData.transitions.find(
    (t: any) => t.to.name.toLowerCase() === statusName.toLowerCase()
  );

  if (!transition) {
    throw new Error(`Transition to '${statusName}' not available`);
  }

  const response = await fetch(`${baseUrl}/issue/${issueKey}/transitions`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authString}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transition: {
        id: transition.id,
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to transition issue");
  }
}

export const jiraRoutes = new Elysia({ prefix: "/jira" }).post(
  "/",
  async ({ body, headers }) => {
    const authHeader = headers["x-oauth-token"];

    if (!authHeader) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Missing Jira authentication credentials",
          },
        ],
        isError: true,
      };
    }

    const [email, apiToken, cloudId] = authHeader.split(":");

    if (!email || !apiToken || !cloudId) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Invalid Jira credentials format. Expected 'email:api_token:cloud_id'",
          },
        ],
        isError: true,
      };
    }

    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const authString = Buffer.from(`${email}:${apiToken}`).toString("base64");

    const { toolName, arguments: args } = body as { toolName: string; arguments: any };

    try {
      switch (toolName) {
        case "list_projects": {
          const response = await fetch(`${baseUrl}/project`, {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const projects = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    projects: projects,
                    count: projects.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_project": {
          const { projectKey } = args;

          const response = await fetch(`${baseUrl}/project/${projectKey}`, {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const project = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(project, null, 2),
              },
            ],
          };
        }

        case "list_issues": {
          const { jql, maxResults = 50, startAt = 0, fields } = args;

          const params = new URLSearchParams({
            jql: jql || "",
            maxResults: maxResults.toString(),
            startAt: startAt.toString(),
          });

          if (fields) {
            params.append("fields", fields.join(","));
          }

          const response = await fetch(`${baseUrl}/search?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    issues: result.issues,
                    total: result.total,
                    startAt: result.startAt,
                    maxResults: result.maxResults,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_issue": {
          const { issueKey, fields } = args;

          let url = `${baseUrl}/issue/${issueKey}`;

          if (fields) {
            const params = new URLSearchParams({
              fields: fields.join(","),
            });
            url += `?${params}`;
          }

          const response = await fetch(url, {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const issue = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(issue, null, 2),
              },
            ],
          };
        }

        case "create_issue": {
          const {
            projectKey,
            summary,
            issueType,
            description,
            priority,
            assignee,
            labels,
          } = args;

          const issueData: any = {
            fields: {
              project: {
                key: projectKey,
              },
              summary: summary,
              issuetype: {
                name: issueType || "Task",
              },
            },
          };

          if (description) {
            issueData.fields.description = {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: description,
                    },
                  ],
                },
              ],
            };
          }

          if (priority) {
            issueData.fields.priority = { name: priority };
          }

          if (assignee) {
            issueData.fields.assignee = { id: assignee };
          }

          if (labels && labels.length > 0) {
            issueData.fields.labels = labels;
          }

          const response = await fetch(`${baseUrl}/issue`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(issueData),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Jira API error: ${response.statusText} - ${error}`
            );
          }

          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    issueId: result.id,
                    issueKey: result.key,
                    self: result.self,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "update_issue": {
          const {
            issueKey,
            summary,
            description,
            status,
            assignee,
            priority,
            labels,
          } = args;

          const updateData: any = {
            fields: {},
          };

          if (summary) {
            updateData.fields.summary = summary;
          }

          if (description) {
            updateData.fields.description = {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: description,
                    },
                  ],
                },
              ],
            };
          }

          if (priority) {
            updateData.fields.priority = { name: priority };
          }

          if (assignee) {
            updateData.fields.assignee = { id: assignee };
          }

          if (labels) {
            updateData.fields.labels = labels;
          }

          const response = await fetch(`${baseUrl}/issue/${issueKey}`, {
            method: "PUT",
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateData),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Jira API error: ${response.statusText} - ${error}`
            );
          }

          if (status) {
            await transitionIssue(baseUrl, authString, issueKey, status);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    issueKey: issueKey,
                    message: "Issue updated successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "add_comment": {
          const { issueKey, comment } = args;

          const commentData = {
            body: {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: comment,
                    },
                  ],
                },
              ],
            },
          };

          const response = await fetch(
            `${baseUrl}/issue/${issueKey}/comment`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${authString}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(commentData),
            }
          );

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    commentId: result.id,
                    message: "Comment added successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_transitions": {
          const { issueKey } = args;

          const response = await fetch(
            `${baseUrl}/issue/${issueKey}/transitions`,
            {
              headers: {
                Authorization: `Basic ${authString}`,
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const result = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    transitions: result.transitions,
                    count: result.transitions.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "transition_issue": {
          const { issueKey, transitionId } = args;

          const response = await fetch(
            `${baseUrl}/issue/${issueKey}/transitions`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${authString}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                transition: {
                  id: transitionId,
                },
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    issueKey: issueKey,
                    message: "Issue transitioned successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "assign_issue": {
          const { issueKey, accountId } = args;

          const response = await fetch(
            `${baseUrl}/issue/${issueKey}/assignee`,
            {
              method: "PUT",
              headers: {
                Authorization: `Basic ${authString}`,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                accountId: accountId,
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    issueKey: issueKey,
                    message: "Issue assigned successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "search_users": {
          const { query, maxResults = 50 } = args;

          const params = new URLSearchParams({
            query: query,
            maxResults: maxResults.toString(),
          });

          const response = await fetch(`${baseUrl}/user/search?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
              Accept: "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const users = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    users: users,
                    count: users.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_board": {
          const { boardId } = args;

          const response = await fetch(
            `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0/board/${boardId}`,
            {
              headers: {
                Authorization: `Basic ${authString}`,
                Accept: "application/json",
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
          }

          const board = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(board, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${toolName}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      console.error(`Jira API error (${toolName}):`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          },
        ],
        isError: true,
      };
    }
  },
  {
    body: t.Object({
      toolName: t.String(),
      arguments: t.Any(),
    }),
  }
);

