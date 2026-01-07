/**
 * OpenAPI Documentation Module
 * Returns the OpenAPI 3.0 specification for the MCP Hub API
 */

import { Elysia } from "elysia";
import { openApiSpec } from "@/lib/openapi";

export const docsRoutes = new Elysia({ prefix: "/docs" })
  .get("/", () => {
    return new Response(JSON.stringify(openApiSpec), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  });

