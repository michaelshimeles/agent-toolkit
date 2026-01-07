/**
 * Catch-all API Route Handler
 * All API routes are handled by the unified Elysia server
 */

import { app } from "@/server";

// Export handlers for all HTTP methods
// Use .fetch for Next.js App Router compatibility
export const GET = app.fetch;
export const POST = app.fetch;
export const PUT = app.fetch;
export const PATCH = app.fetch;
export const DELETE = app.fetch;
export const OPTIONS = app.fetch;

