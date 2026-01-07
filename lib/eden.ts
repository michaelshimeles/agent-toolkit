/**
 * Eden Client for Type-Safe API Calls
 * Uses the unified Elysia app type for full type inference
 */

import { treaty } from "@elysiajs/eden";
import type { App } from "@/server";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Create the Eden client with full type safety
// Use dynamic import for server-side usage, treaty for client-side
export const api = treaty<App>(appUrl);

// Helper type for extracting response types
export type ApiResponse<T extends keyof typeof api> = Awaited<
  ReturnType<(typeof api)[T]["get"]>
>;
