/**
 * Gmail Integration
 * Provides MCP tools for reading, sending, and managing Gmail messages
 */

import { Elysia, t } from "elysia";
import { google } from "googleapis";

export const gmailRoutes = new Elysia({ prefix: "/gmail" }).post(
  "/",
  async ({ body, headers }) => {
    const accessToken = headers["x-oauth-token"];

    if (!accessToken) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Missing Google OAuth token",
          },
        ],
        isError: true,
      };
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth });

    const { toolName, arguments: args } = body as { toolName: string; arguments: any };

    try {
      switch (toolName) {
        case "list_messages": {
          const { query, maxResults = 10, labelIds } = args;

          const params: any = {
            userId: "me",
            maxResults: maxResults,
          };

          if (query) params.q = query;
          if (labelIds) params.labelIds = labelIds;

          const response = await gmail.users.messages.list(params);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    messages: response.data.messages || [],
                    resultSizeEstimate: response.data.resultSizeEstimate || 0,
                    nextPageToken: response.data.nextPageToken,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_message": {
          const { messageId, format = "full" } = args;

          const response = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: format,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case "send_message": {
          const { to, subject, body: emailBody, cc, bcc } = args;

          const emailLines = [
            `To: ${to}`,
            subject ? `Subject: ${subject}` : "",
            cc ? `Cc: ${cc}` : "",
            bcc ? `Bcc: ${bcc}` : "",
            "Content-Type: text/html; charset=utf-8",
            "",
            emailBody,
          ];

          const email = emailLines.filter((line) => line).join("\n");
          const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: encodedEmail,
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    messageId: response.data.id,
                    threadId: response.data.threadId,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "search_messages": {
          const { searchTerm, from, to, hasAttachment, after, before } = args;

          const parts: string[] = [];

          if (searchTerm) parts.push(searchTerm);
          if (from) parts.push(`from:${from}`);
          if (to) parts.push(`to:${to}`);
          if (hasAttachment) parts.push("has:attachment");
          if (after) parts.push(`after:${after}`);
          if (before) parts.push(`before:${before}`);

          const query = parts.join(" ");

          const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 20,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    messages: response.data.messages || [],
                    count: response.data.resultSizeEstimate || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_thread": {
          const { threadId, format = "full" } = args;

          const response = await gmail.users.threads.get({
            userId: "me",
            id: threadId,
            format: format,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response.data, null, 2),
              },
            ],
          };
        }

        case "reply_to_message": {
          const { messageId, body: replyBody } = args;

          const originalMessage = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const threadId = originalMessage.data.threadId;
          const headers = originalMessage.data.payload?.headers || [];

          const toHeader = headers.find((h) => h.name === "From");
          const subjectHeader = headers.find((h) => h.name === "Subject");

          const to = toHeader?.value || "";
          const subject = subjectHeader?.value?.startsWith("Re:")
            ? subjectHeader.value
            : `Re: ${subjectHeader?.value || ""}`;

          const emailLines = [
            `To: ${to}`,
            `Subject: ${subject}`,
            "Content-Type: text/html; charset=utf-8",
            "",
            replyBody,
          ];

          const email = emailLines.join("\n");
          const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
              raw: encodedEmail,
              threadId: threadId,
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    messageId: response.data.id,
                    threadId: response.data.threadId,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "delete_message": {
          const { messageId } = args;

          await gmail.users.messages.delete({
            userId: "me",
            id: messageId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    messageId: messageId,
                    message: "Message deleted successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "trash_message": {
          const { messageId } = args;

          const response = await gmail.users.messages.trash({
            userId: "me",
            id: messageId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    messageId: response.data.id,
                    message: "Message moved to trash",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "modify_labels": {
          const { messageId, addLabelIds, removeLabelIds } = args;

          const response = await gmail.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
              addLabelIds: addLabelIds || [],
              removeLabelIds: removeLabelIds || [],
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    messageId: response.data.id,
                    labelIds: response.data.labelIds,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "list_labels": {
          const response = await gmail.users.labels.list({
            userId: "me",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    labels: response.data.labels || [],
                    count: response.data.labels?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "create_draft": {
          const { to, subject, body: draftBody, cc, bcc } = args;

          const emailLines = [
            `To: ${to}`,
            subject ? `Subject: ${subject}` : "",
            cc ? `Cc: ${cc}` : "",
            bcc ? `Bcc: ${bcc}` : "",
            "Content-Type: text/html; charset=utf-8",
            "",
            draftBody,
          ];

          const email = emailLines.filter((line) => line).join("\n");
          const encodedEmail = Buffer.from(email)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

          const response = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
              message: {
                raw: encodedEmail,
              },
            },
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    draftId: response.data.id,
                    message: "Draft created successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_attachments": {
          const { messageId } = args;

          const message = await gmail.users.messages.get({
            userId: "me",
            id: messageId,
            format: "full",
          });

          const attachments: any[] = [];

          const extractAttachments = (parts: any[]) => {
            for (const part of parts) {
              if (part.filename && part.body?.attachmentId) {
                attachments.push({
                  filename: part.filename,
                  mimeType: part.mimeType,
                  size: part.body.size,
                  attachmentId: part.body.attachmentId,
                });
              }
              if (part.parts) {
                extractAttachments(part.parts);
              }
            }
          };

          if (message.data.payload?.parts) {
            extractAttachments(message.data.payload.parts);
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    messageId: messageId,
                    attachments: attachments,
                    count: attachments.length,
                  },
                  null,
                  2
                ),
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
      console.error(`Gmail API error (${toolName}):`, error);
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

