/**
 * API Keys Management Module
 * Provides endpoints for listing, creating, and revoking API keys
 */

import { Elysia, t } from "elysia";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex";
import { generateApiKey, hashApiKey } from "@/lib/encryption";
import { api } from "@/convex/_generated/api";

export const keysRoutes = new Elysia({ prefix: "/keys" })
  // List all API keys for the current user
  .get("/", async () => {
    try {
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const convex = getConvexClient();

      const user = await convex.query(api.auth.getUserByClerkId, { clerkId });

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const apiKeys = await convex.query(api.auth.listApiKeys, {
        userId: user._id,
      });

      const safeKeys = apiKeys.map((key: any) => ({
        _id: key._id,
        name: key.name,
        lastUsed: key.lastUsed,
        _creationTime: key._creationTime,
      }));

      return { keys: safeKeys };
    } catch (error) {
      console.error("Error listing API keys:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  })

  // Create a new API key
  .post(
    "/",
    async ({ body }) => {
      try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { name } = body as { name: string };

        if (!name || typeof name !== "string") {
          return new Response(
            JSON.stringify({ error: "Name is required and must be a string" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        const convex = getConvexClient();

        const user = await convex.query(api.auth.getUserByClerkId, { clerkId });

        if (!user) {
          return new Response(JSON.stringify({ error: "User not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const apiKey = generateApiKey();
        const keyHash = hashApiKey(apiKey);

        const keyId = await convex.mutation(api.auth.createApiKey, {
          userId: user._id,
          keyHash,
          name,
        });

        return {
          keyId,
          apiKey,
          name,
          message:
            "Save this key somewhere safe. You won't be able to see it again.",
        };
      } catch (error) {
        console.error("Error creating API key:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )

  // Revoke an API key
  .delete("/", async ({ query }) => {
    try {
      const { userId: clerkId } = await auth();

      if (!clerkId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const keyId = query.id;

      if (!keyId) {
        return new Response(JSON.stringify({ error: "Key ID is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const convex = getConvexClient();

      const user = await convex.query(api.auth.getUserByClerkId, { clerkId });

      if (!user) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const apiKeys = await convex.query(api.auth.listApiKeys, {
        userId: user._id,
      });

      const keyBelongsToUser = apiKeys.some((key: any) => key._id === keyId);

      if (!keyBelongsToUser) {
        return new Response(
          JSON.stringify({ error: "Key not found or unauthorized" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await convex.mutation(api.auth.revokeApiKey, {
        apiKeyId: keyId as any,
      });

      return { success: true, message: "API key revoked" };
    } catch (error) {
      console.error("Error revoking API key:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  });

