/**
 * Airtable Integration
 * Provides MCP tools for managing Airtable bases, tables, and records
 */

import { Elysia, t } from "elysia";

export const airtableRoutes = new Elysia({ prefix: "/airtable" }).post(
  "/",
  async ({ body, headers }) => {
    const apiKey = headers["x-oauth-token"];

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Missing Airtable API key",
          },
        ],
        isError: true,
      };
    }

    const { toolName, arguments: args } = body as { toolName: string; arguments: any };

    try {
      switch (toolName) {
        case "list_bases": {
          const response = await fetch("https://api.airtable.com/v0/meta/bases", {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    bases: data.bases,
                    count: data.bases?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_base_schema": {
          const { baseId } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }

        case "list_records": {
          const {
            baseId,
            tableId,
            maxRecords = 100,
            view,
            fields,
            filterByFormula,
            sort,
          } = args;

          let url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;
          const params = new URLSearchParams();

          if (maxRecords) params.append("maxRecords", maxRecords.toString());
          if (view) params.append("view", view);
          if (filterByFormula) params.append("filterByFormula", filterByFormula);

          if (fields && fields.length > 0) {
            fields.forEach((field: string) => params.append("fields[]", field));
          }

          if (sort && sort.length > 0) {
            sort.forEach((s: any, index: number) => {
              params.append(`sort[${index}][field]`, s.field);
              params.append(`sort[${index}][direction]`, s.direction || "asc");
            });
          }

          const queryString = params.toString();
          if (queryString) url += `?${queryString}`;

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    records: data.records,
                    count: data.records?.length || 0,
                    offset: data.offset,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_record": {
          const { baseId, tableId, recordId } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
            {
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const record = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(record, null, 2),
              },
            ],
          };
        }

        case "create_record": {
          const { baseId, tableId, fields } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fields: fields,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Airtable API error: ${response.statusText} - ${error}`
            );
          }

          const record = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    record: record,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "create_records": {
          const { baseId, tableId, records } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                records: records.map((r: any) => ({ fields: r })),
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Airtable API error: ${response.statusText} - ${error}`
            );
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    records: data.records,
                    count: data.records?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "update_record": {
          const { baseId, tableId, recordId, fields } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fields: fields,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Airtable API error: ${response.statusText} - ${error}`
            );
          }

          const record = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    record: record,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "update_records": {
          const { baseId, tableId, records } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`,
            {
              method: "PATCH",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                records: records.map((r: any) => ({
                  id: r.id,
                  fields: r.fields,
                })),
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            throw new Error(
              `Airtable API error: ${response.statusText} - ${error}`
            );
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    records: data.records,
                    count: data.records?.length || 0,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "delete_record": {
          const { baseId, tableId, recordId } = args;

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}/${recordId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    deleted: data.deleted,
                    id: data.id,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "delete_records": {
          const { baseId, tableId, recordIds } = args;

          const params = new URLSearchParams();
          recordIds.forEach((id: string) => params.append("records[]", id));

          const response = await fetch(
            `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}?${params}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Airtable API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    records: data.records,
                    count: data.records?.length || 0,
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
      console.error(`Airtable API error (${toolName}):`, error);
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

