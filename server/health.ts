/**
 * Health Check Module
 * Returns the health status of the application and its dependencies
 */

import { Elysia } from "elysia";

async function checkConvex(): Promise<"ok" | "error"> {
  try {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      return "error";
    }
    return "ok";
  } catch {
    return "error";
  }
}

function checkClerk(): "ok" | "error" {
  try {
    if (
      !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      !process.env.CLERK_SECRET_KEY
    ) {
      return "error";
    }
    return "ok";
  } catch {
    return "error";
  }
}

export const healthRoutes = new Elysia({ prefix: "/health" })
  .get("/", async () => {
    const health = {
      status: "ok" as const,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {
        api: "ok" as const,
        database: await checkConvex(),
        auth: checkClerk(),
      },
    };

    const allHealthy = Object.values(health.services).every((s) => s === "ok");

    if (!allHealthy) {
      return new Response(JSON.stringify(health), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }

    return health;
  });

