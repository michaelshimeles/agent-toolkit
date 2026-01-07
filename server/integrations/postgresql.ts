/**
 * PostgreSQL Integration for MCP Hub
 * Provides database query, schema inspection, and management tools
 */

import { Elysia, t } from "elysia";
import { Pool } from "pg";

export const postgresqlRoutes = new Elysia({ prefix: "/postgresql" }).post(
  "/",
  async ({ body, headers }) => {
    const connectionString = headers["x-oauth-token"];

    if (!connectionString) {
      return new Response("Missing database connection string", {
        status: 401,
      });
    }

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    try {
      const { toolName, arguments: args } = body as { toolName: string; arguments?: any };

      switch (toolName) {
        case "execute_query": {
          const { query, params } = args;
          const client = await pool.connect();

          try {
            const result = await client.query(query, params || []);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      rows: result.rows,
                      rowCount: result.rowCount,
                      fields: result.fields.map((f) => ({
                        name: f.name,
                        dataType: f.dataTypeID,
                      })),
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "list_tables": {
          const { schema } = args;
          const schemaFilter = schema || "public";

          const client = await pool.connect();
          try {
            const result = await client.query(
              `
              SELECT
                table_name,
                table_type,
                table_schema
              FROM information_schema.tables
              WHERE table_schema = $1
              ORDER BY table_name
            `,
              [schemaFilter]
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      schema: schemaFilter,
                      tables: result.rows,
                      count: result.rowCount,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "describe_table": {
          const { tableName, schema } = args;
          const schemaName = schema || "public";

          const client = await pool.connect();
          try {
            const columnsResult = await client.query(
              `
              SELECT
                column_name,
                data_type,
                character_maximum_length,
                is_nullable,
                column_default
              FROM information_schema.columns
              WHERE table_schema = $1 AND table_name = $2
              ORDER BY ordinal_position
            `,
              [schemaName, tableName]
            );

            const pkResult = await client.query(
              `
              SELECT a.attname
              FROM pg_index i
              JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
              WHERE i.indrelid = $1::regclass
                AND i.indisprimary
            `,
              [`${schemaName}.${tableName}`]
            );

            const indexResult = await client.query(
              `
              SELECT
                i.relname AS index_name,
                a.attname AS column_name,
                ix.indisunique AS is_unique
              FROM pg_class t
              JOIN pg_index ix ON t.oid = ix.indrelid
              JOIN pg_class i ON i.oid = ix.indexrelid
              JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
              WHERE t.relname = $1
                AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = $2)
            `,
              [tableName, schemaName]
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      schema: schemaName,
                      table: tableName,
                      columns: columnsResult.rows,
                      primaryKeys: pkResult.rows.map((r) => r.attname),
                      indexes: indexResult.rows,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "list_schemas": {
          const client = await pool.connect();
          try {
            const result = await client.query(`
              SELECT
                schema_name
              FROM information_schema.schemata
              WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
              ORDER BY schema_name
            `);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      schemas: result.rows.map((r) => r.schema_name),
                      count: result.rowCount,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "get_table_size": {
          const { tableName, schema } = args;
          const schemaName = schema || "public";

          const client = await pool.connect();
          try {
            const result = await client.query(
              `
              SELECT
                pg_size_pretty(pg_total_relation_size($1)) AS total_size,
                pg_size_pretty(pg_relation_size($1)) AS table_size,
                pg_size_pretty(pg_total_relation_size($1) - pg_relation_size($1)) AS indexes_size
            `,
              [`${schemaName}.${tableName}`]
            );

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      schema: schemaName,
                      table: tableName,
                      ...result.rows[0],
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "list_databases": {
          const client = await pool.connect();
          try {
            const result = await client.query(`
              SELECT
                datname AS database_name,
                pg_size_pretty(pg_database_size(datname)) AS size
              FROM pg_database
              WHERE datistemplate = false
              ORDER BY datname
            `);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      databases: result.rows,
                      count: result.rowCount,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "get_table_stats": {
          const { tableName, schema } = args;
          const schemaName = schema || "public";

          const client = await pool.connect();
          try {
            const result = await client.query(
              `
              SELECT
                schemaname,
                tablename,
                n_live_tup AS row_count,
                n_dead_tup AS dead_rows,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
              FROM pg_stat_user_tables
              WHERE schemaname = $1 AND tablename = $2
            `,
              [schemaName, tableName]
            );

            if (result.rowCount === 0) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Table ${schemaName}.${tableName} not found or has no statistics`,
                  },
                ],
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(result.rows[0], null, 2),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        case "list_active_queries": {
          const client = await pool.connect();
          try {
            const result = await client.query(`
              SELECT
                pid,
                usename AS username,
                application_name,
                client_addr,
                state,
                query,
                query_start,
                state_change,
                EXTRACT(EPOCH FROM (now() - query_start)) AS duration_seconds
              FROM pg_stat_activity
              WHERE state != 'idle'
                AND pid != pg_backend_pid()
              ORDER BY query_start DESC
              LIMIT 50
            `);

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      activeQueries: result.rows,
                      count: result.rowCount,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          } finally {
            client.release();
          }
        }

        default:
          return new Response(`Unknown tool: ${toolName}`, { status: 400 });
      }
    } catch (error) {
      console.error("PostgreSQL error:", error);
      return new Response(
        JSON.stringify({
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
          isError: true,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    } finally {
      await pool.end();
    }
  },
  {
    body: t.Object({
      toolName: t.String(),
      arguments: t.Optional(t.Any()),
    }),
  }
);

