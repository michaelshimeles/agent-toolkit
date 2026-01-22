/**
 * Helper to get user's Anthropic API key from settings
 */

import { getConvexClient } from "./convex";
import { decrypt } from "./encryption";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

/**
 * Get the user's Anthropic API key by Clerk ID, decrypted
 * Returns null if no key is configured
 */
export async function getUserAnthropicApiKeyByClerkId(clerkId: string): Promise<string | null> {
  try {
    const convex = getConvexClient();

    // Get the user
    const user = await convex.query(api.auth.getUserByClerkId, { clerkId });
    if (!user) {
      return null;
    }

    // Get the user's settings
    const settings = await convex.query(api.settings.getUserSettings, {
      userId: user._id,
    });

    if (!settings?.anthropicApiKey) {
      return null;
    }

    // Decrypt the API key
    return decrypt(settings.anthropicApiKey);
  } catch (error) {
    console.error("Error getting user Anthropic API key:", error);
    return null;
  }
}

/**
 * Get the user's Anthropic API key by Convex user ID, decrypted
 * Returns null if no key is configured
 */
export async function getUserAnthropicApiKey(userId: Id<"users">): Promise<string | null> {
  try {
    const convex = getConvexClient();

    // Get the user's settings directly using userId
    const settings = await convex.query(api.settings.getUserSettings, {
      userId,
    });

    if (!settings?.anthropicApiKey) {
      return null;
    }

    // Decrypt the API key
    return decrypt(settings.anthropicApiKey);
  } catch (error) {
    console.error("Error getting user Anthropic API key:", error);
    return null;
  }
}
