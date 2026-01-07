/**
 * Webhooks Module
 * Handles webhooks from external services (Clerk, etc.)
 */

import { Elysia, t } from "elysia";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export const webhooksRoutes = new Elysia({ prefix: "/webhooks" })
  // Clerk webhook handler
  .post("/clerk", async ({ request, headers }) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error(
        "Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
      );
    }

    const svix_id = headers["svix-id"];
    const svix_timestamp = headers["svix-timestamp"];
    const svix_signature = headers["svix-signature"];

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response("Error: Missing svix headers", { status: 400 });
    }

    const body = await request.text();

    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
      evt = wh.verify(body, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error("Error verifying webhook:", err);
      return new Response("Error: Verification error", { status: 400 });
    }

    const eventType = evt.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id, email_addresses, first_name, last_name, image_url } =
        evt.data;

      const email = email_addresses[0]?.email_address;
      if (!email) {
        return new Response("Error: No email address found", { status: 400 });
      }

      const name =
        first_name && last_name ? `${first_name} ${last_name}` : undefined;

      try {
        await convex.mutation(api.auth.upsertUserFromClerk, {
          clerkId: id,
          email,
          name,
          imageUrl: image_url,
        });
      } catch (error) {
        console.error("Error syncing user to Convex:", error);
        return new Response("Error: Failed to sync user", { status: 500 });
      }
    } else if (eventType === "user.deleted") {
      const { id } = evt.data;

      if (!id) {
        return new Response("Error: No user ID found", { status: 400 });
      }

      try {
        const user = await convex.query(api.auth.getUserByClerkId, {
          clerkId: id,
        });

        if (user) {
          await convex.mutation(api.auth.deleteUser, {
            userId: user._id,
          });
        }
      } catch (error) {
        console.error("Error deleting user from Convex:", error);
        return new Response("Error: Failed to delete user", { status: 500 });
      }
    }

    return new Response("Webhook received successfully", { status: 200 });
  });

