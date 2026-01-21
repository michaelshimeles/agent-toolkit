/**
 * User Settings Module
 * Provides endpoints for managing user settings like Anthropic API key
 */

import { Elysia, t } from "elysia";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex";
import { encrypt, decrypt } from "@/lib/encryption";
import { api } from "@/convex/_generated/api";

export const settingsRoutes = new Elysia({ prefix: "/settings" })
  // Get current settings (returns whether API key is configured, not the key itself)
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

      const hasApiKey = await convex.query(api.settings.hasAnthropicApiKey, {
        userId: user._id,
      });

      return {
        hasAnthropicApiKey: hasApiKey,
      };
    } catch (error) {
      console.error("Error getting settings:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  })

  // Save Anthropic API key
  .post(
    "/anthropic-key",
    async ({ body }) => {
      try {
        const { userId: clerkId } = await auth();

        if (!clerkId) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { apiKey } = body as { apiKey: string };

        if (!apiKey || typeof apiKey !== "string") {
          return new Response(
            JSON.stringify({ error: "API key is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // Basic validation - Anthropic API keys start with "sk-ant-"
        if (!apiKey.startsWith("sk-ant-")) {
          return new Response(
            JSON.stringify({ error: "Invalid Anthropic API key format. Keys should start with 'sk-ant-'" }),
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

        // Encrypt the API key before storing
        const encryptedApiKey = encrypt(apiKey);

        await convex.mutation(api.settings.saveAnthropicApiKey, {
          userId: user._id,
          encryptedApiKey,
        });

        return {
          success: true,
          message: "Anthropic API key saved successfully",
        };
      } catch (error) {
        console.error("Error saving Anthropic API key:", error);
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
    {
      body: t.Object({
        apiKey: t.String(),
      }),
    }
  )

  // Delete Anthropic API key
  .delete("/anthropic-key", async () => {
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

      await convex.mutation(api.settings.deleteAnthropicApiKey, {
        userId: user._id,
      });

      return {
        success: true,
        message: "Anthropic API key deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting Anthropic API key:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  })

  // Internal endpoint to get decrypted API key (for server-side use only)
  // This should only be called from server-side code, not exposed to clients
  .get("/anthropic-key/internal", async ({ headers }) => {
    try {
      // This endpoint requires internal authorization
      const internalSecret = headers["x-internal-secret"];
      if (internalSecret !== process.env.INTERNAL_API_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const clerkId = headers["x-clerk-user-id"];
      if (!clerkId) {
        return new Response(JSON.stringify({ error: "User ID required" }), {
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

      const settings = await convex.query(api.settings.getUserSettings, {
        userId: user._id,
      });

      if (!settings?.anthropicApiKey) {
        return { apiKey: null };
      }

      // Decrypt the API key
      const decryptedApiKey = decrypt(settings.anthropicApiKey);

      return { apiKey: decryptedApiKey };
    } catch (error) {
      console.error("Error getting Anthropic API key:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  });
