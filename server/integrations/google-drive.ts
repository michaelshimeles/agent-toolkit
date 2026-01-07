/**
 * Google Drive Integration
 * Provides MCP tools for interacting with Google Drive files and folders
 */

import { Elysia, t } from "elysia";
import { google } from "googleapis";

export const googleDriveRoutes = new Elysia({ prefix: "/google-drive" }).post(
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
    const drive = google.drive({ version: "v3", auth });

    const { toolName, arguments: args } = body as { toolName: string; arguments: any };

    try {
      switch (toolName) {
        case "list_files": {
          const { query, pageSize = 10, orderBy = "modifiedTime desc" } = args;

          const response = await drive.files.list({
            q: query,
            pageSize: pageSize,
            orderBy: orderBy,
            fields:
              "files(id, name, mimeType, modifiedTime, size, webViewLink, owners)",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    files: response.data.files,
                    count: response.data.files?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "search_files": {
          const { searchTerm, mimeType } = args;

          let query = `name contains '${searchTerm}'`;
          if (mimeType) {
            query += ` and mimeType='${mimeType}'`;
          }

          const response = await drive.files.list({
            q: query,
            pageSize: 20,
            orderBy: "modifiedTime desc",
            fields:
              "files(id, name, mimeType, modifiedTime, size, webViewLink)",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    results: response.data.files,
                    count: response.data.files?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_file": {
          const { fileId } = args;

          const response = await drive.files.get({
            fileId: fileId,
            fields:
              "id, name, mimeType, description, createdTime, modifiedTime, size, webViewLink, webContentLink, owners, permissions",
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

        case "download_file": {
          const { fileId } = args;

          const response = await drive.files.get(
            {
              fileId: fileId,
              alt: "media",
            },
            { responseType: "text" }
          );

          return {
            content: [
              {
                type: "text",
                text:
                  typeof response.data === "string"
                    ? response.data
                    : JSON.stringify(response.data),
              },
            ],
          };
        }

        case "create_file": {
          const { name, mimeType, content, folderId } = args;

          const fileMetadata: any = {
            name: name,
            mimeType: mimeType,
          };

          if (folderId) {
            fileMetadata.parents = [folderId];
          }

          const media = {
            mimeType: mimeType,
            body: content,
          };

          const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: "id, name, webViewLink",
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

        case "create_folder": {
          const { name, parentFolderId } = args;

          const fileMetadata: any = {
            name: name,
            mimeType: "application/vnd.google-apps.folder",
          };

          if (parentFolderId) {
            fileMetadata.parents = [parentFolderId];
          }

          const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: "id, name, webViewLink",
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

        case "update_file": {
          const { fileId, name, description } = args;

          const fileMetadata: any = {};
          if (name) fileMetadata.name = name;
          if (description) fileMetadata.description = description;

          const response = await drive.files.update({
            fileId: fileId,
            requestBody: fileMetadata,
            fields: "id, name, description, modifiedTime",
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

        case "delete_file": {
          const { fileId } = args;

          await drive.files.delete({
            fileId: fileId,
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    fileId: fileId,
                    message: "File deleted successfully",
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "share_file": {
          const { fileId, email, role = "reader", type = "user" } = args;

          const permission = await drive.permissions.create({
            fileId: fileId,
            requestBody: {
              type: type,
              role: role,
              emailAddress: email,
            },
            fields: "id",
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    permissionId: permission.data.id,
                    message: `File shared with ${email} as ${role}`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "export_file": {
          const { fileId, mimeType } = args;

          const response = await drive.files.export(
            {
              fileId: fileId,
              mimeType: mimeType,
            },
            { responseType: "text" }
          );

          return {
            content: [
              {
                type: "text",
                text:
                  typeof response.data === "string"
                    ? response.data
                    : JSON.stringify(response.data),
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
      console.error(`Google Drive API error (${toolName}):`, error);
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

