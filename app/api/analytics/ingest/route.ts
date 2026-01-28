/**
 * Analytics Ingestion Endpoint
 * 
 * This endpoint receives anonymous analytics data from deployed MCP servers.
 * It's called asynchronously after each tool call by the deployed servers.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

export const runtime = "edge";

// Rate limiting: simple in-memory store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 1000; // requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (entry.count >= RATE_LIMIT) {
    return false;
  }
  
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Basic rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.toolName || !body.serverId) {
      return NextResponse.json(
        { error: "Missing required fields: toolName, serverId" },
        { status: 400 }
      );
    }

    // Extract geo region from headers (set by Vercel Edge)
    const geoRegion = request.headers.get("x-vercel-ip-country") || undefined;

    // Prepare analytics data
    const analyticsData = {
      // Core fields
      sessionHash: body.sessionHash || `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      serverId: body.serverId,
      integrationSlug: body.serverSlug || undefined,
      toolName: body.toolName,

      // Model & Client (from headers passed by the calling client)
      modelId: body.modelId || undefined,
      clientId: body.clientId || undefined,
      clientVersion: body.clientVersion || undefined,

      // Execution metrics
      latencyMs: body.latencyMs || 0,
      status: body.status || "success",
      errorCategory: body.errorCategory || undefined,
      inputTokenEstimate: body.inputTokenEstimate || undefined,
      outputTokenEstimate: body.outputTokenEstimate || undefined,

      // Retry & Agent loop
      isRetry: body.isRetry || false,
      retryCount: body.retryCount || 0,
      sessionCallIndex: body.sessionCallIndex || 1,
      agentLoopDepth: body.agentLoopDepth || undefined,

      // Execution mode
      executionMode: body.executionMode || "sequential",
      batchId: body.batchId || undefined,
      batchSize: body.batchSize || undefined,

      // Parameter complexity
      parameterSchema: body.parameterSchema || undefined,
      paramDepth: body.paramDepth || undefined,
      paramCount: body.paramCount || undefined,
      arrayMaxLength: body.arrayMaxLength || undefined,

      // Geographic & Rate limiting
      geoRegion,
      hitRateLimit: body.hitRateLimit || false,
      rateLimitType: body.rateLimitType || undefined,
    };

    // Log to Convex (fire and forget, don't block response)
    const convex = getConvexClient();
    
    // We use a background promise that doesn't block the response
    // This ensures deployed servers get a fast response
    const logPromise = convex.mutation(api.analytics.logToolCall, analyticsData as any);
    
    // Use waitUntil if available (Vercel Edge), otherwise just fire and forget
    if (typeof (globalThis as any).waitUntil === "function") {
      (globalThis as any).waitUntil(logPromise);
    } else {
      logPromise.catch((err: Error) => {
        console.error("Failed to log analytics:", err);
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics ingestion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Allow OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
