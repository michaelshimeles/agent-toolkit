"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { encrypt, decrypt } from "../lib/encryption";

/**
 * Store external API key for a server (encrypted)
 */
export const storeExternalApiKey = action({
  args: {
    userId: v.id("users"),
    serverId: v.id("generatedServers"),
    serviceName: v.string(),
    serviceKey: v.string(),
    keyName: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Encrypt the API key before storage
    const encryptedKey = encrypt(args.serviceKey);

    const result = await ctx.runMutation(api.builder._storeEncryptedApiKey, {
      userId: args.userId,
      serverId: args.serverId,
      serviceName: args.serviceName,
      encryptedKey,
      keyName: args.keyName,
    });
    return result as string;
  },
});

/**
 * Get decrypted external API key (for deployment - action only)
 */
export const getDecryptedApiKey = action({
  args: {
    userId: v.id("users"),
    serviceName: v.string(),
  },
  handler: async (ctx, args): Promise<string | null> => {
    const record = await ctx.runQuery(api.builder.getExternalApiKey, {
      userId: args.userId,
      serviceName: args.serviceName,
    });

    if (!record) {
      return null;
    }

    // Need to fetch the actual encrypted key from the internal query
    const fullRecord: any = await ctx.runQuery(api.builder._getEncryptedApiKeyInternal, {
      userId: args.userId,
      serviceName: args.serviceName,
    });

    if (!fullRecord) {
      return null;
    }

    // Decrypt the API key
    try {
      return decrypt(fullRecord.serviceKey);
    } catch (error) {
      console.error("Failed to decrypt API key:", error);
      return null;
    }
  },
});
