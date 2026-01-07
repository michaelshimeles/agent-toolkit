/**
 * Version Control for Generated Servers
 * Handles version history, rollback, and change tracking
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Create a new version of a server
 */
export const createVersion = mutation({
  args: {
    serverId: v.id("generatedServers"),
    code: v.string(),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Get current version history
    const previousVersions = server.previousVersions || [];
    const currentVersion = server.version;

    // Create version snapshot
    const versionSnapshot = JSON.stringify({
      version: currentVersion,
      code: server.code,
      timestamp: Date.now(),
      changeDescription: args.changeDescription || "Manual save",
      tools: server.tools,
      deploymentUrl: server.deploymentUrl,
      status: server.status,
    });

    // Update server with new code and version
    await ctx.db.patch(args.serverId, {
      code: args.code,
      version: currentVersion + 1,
      previousVersions: [...previousVersions, versionSnapshot],
    });

    return {
      newVersion: currentVersion + 1,
      previousVersion: currentVersion,
    };
  },
});

/**
 * List all versions of a server
 */
export const listVersions = query({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    const versions = [];

    // Add current version
    versions.push({
      version: server.version,
      code: server.code,
      timestamp: server._creationTime,
      changeDescription: "Current version",
      tools: server.tools,
      deploymentUrl: server.deploymentUrl,
      status: server.status,
      isCurrent: true,
    });

    // Add previous versions
    if (server.previousVersions) {
      server.previousVersions.reverse().forEach((versionSnapshot) => {
        try {
          const parsed = JSON.parse(versionSnapshot);
          versions.push({
            ...parsed,
            isCurrent: false,
          });
        } catch (error) {
          // Skip invalid version snapshots
        }
      });
    }

    return versions;
  },
});

/**
 * Get a specific version of a server
 */
export const getVersion = query({
  args: {
    serverId: v.id("generatedServers"),
    version: v.number(),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Check if requesting current version
    if (args.version === server.version) {
      return {
        version: server.version,
        code: server.code,
        timestamp: server._creationTime,
        changeDescription: "Current version",
        tools: server.tools,
        deploymentUrl: server.deploymentUrl,
        status: server.status,
        isCurrent: true,
      };
    }

    // Search previous versions
    if (server.previousVersions) {
      for (const versionSnapshot of server.previousVersions) {
        try {
          const parsed = JSON.parse(versionSnapshot);
          if (parsed.version === args.version) {
            return {
              ...parsed,
              isCurrent: false,
            };
          }
        } catch (error) {
          // Skip invalid version snapshots
        }
      }
    }

    throw new Error(`Version ${args.version} not found`);
  },
});

/**
 * Rollback to a previous version
 */
export const rollbackToVersion = mutation({
  args: {
    serverId: v.id("generatedServers"),
    targetVersion: v.number(),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Can't rollback to current version
    if (args.targetVersion === server.version) {
      throw new Error("Already on this version");
    }

    // Find target version in history
    if (!server.previousVersions) {
      throw new Error("No version history available");
    }

    let targetVersionData: any = null;
    for (const versionSnapshot of server.previousVersions) {
      try {
        const parsed = JSON.parse(versionSnapshot);
        if (parsed.version === args.targetVersion) {
          targetVersionData = parsed;
          break;
        }
      } catch (error) {
        // Skip invalid version snapshots
      }
    }

    if (!targetVersionData) {
      throw new Error(`Version ${args.targetVersion} not found`);
    }

    // Save current version to history before rollback
    const previousVersions = server.previousVersions || [];
    const currentVersion = server.version;
    const versionSnapshot = JSON.stringify({
      version: currentVersion,
      code: server.code,
      timestamp: Date.now(),
      changeDescription: `Before rollback to v${args.targetVersion}`,
      tools: server.tools,
      deploymentUrl: server.deploymentUrl,
      status: server.status,
    });

    // Perform rollback
    await ctx.db.patch(args.serverId, {
      code: targetVersionData.code,
      version: server.version + 1, // Increment version even on rollback
      previousVersions: [...previousVersions, versionSnapshot],
      // Note: tools, deploymentUrl, and status from target version are NOT restored
      // to avoid breaking deployed servers. Only code is rolled back.
    });

    return {
      newVersion: server.version + 1,
      rolledBackFrom: currentVersion,
      rolledBackTo: args.targetVersion,
    };
  },
});

/**
 * Compare two versions
 */
export const compareVersions = query({
  args: {
    serverId: v.id("generatedServers"),
    versionA: v.number(),
    versionB: v.number(),
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    // Get both versions
    const getVersionData = (version: number) => {
      if (version === server.version) {
        return {
          version: server.version,
          code: server.code,
          timestamp: server._creationTime,
        };
      }

      if (server.previousVersions) {
        for (const versionSnapshot of server.previousVersions) {
          try {
            const parsed = JSON.parse(versionSnapshot);
            if (parsed.version === version) {
              return {
                version: parsed.version,
                code: parsed.code,
                timestamp: parsed.timestamp,
              };
            }
          } catch (error) {
            // Skip
          }
        }
      }

      return null;
    };

    const versionDataA = getVersionData(args.versionA);
    const versionDataB = getVersionData(args.versionB);

    if (!versionDataA) {
      throw new Error(`Version ${args.versionA} not found`);
    }
    if (!versionDataB) {
      throw new Error(`Version ${args.versionB} not found`);
    }

    // Calculate diff statistics
    const linesA = versionDataA.code.split("\n");
    const linesB = versionDataB.code.split("\n");

    const stats = {
      linesAdded: Math.max(0, linesB.length - linesA.length),
      linesRemoved: Math.max(0, linesA.length - linesB.length),
      charactersChanged: Math.abs(versionDataB.code.length - versionDataA.code.length),
    };

    return {
      versionA: versionDataA,
      versionB: versionDataB,
      diff: stats,
    };
  },
});

/**
 * Delete old versions (keep only N most recent)
 */
export const pruneVersions = mutation({
  args: {
    serverId: v.id("generatedServers"),
    keepCount: v.number(), // Number of versions to keep
  },
  handler: async (ctx, args) => {
    const server = await ctx.db.get(args.serverId);
    if (!server) {
      throw new Error("Server not found");
    }

    if (!server.previousVersions || server.previousVersions.length === 0) {
      return { pruned: 0 };
    }

    // Keep only the most recent N versions
    const versionsToKeep = args.keepCount > 0 ? args.keepCount : 10;
    const previousVersions = server.previousVersions;

    if (previousVersions.length <= versionsToKeep) {
      return { pruned: 0 };
    }

    const prunedVersions = previousVersions.slice(-versionsToKeep);
    const prunedCount = previousVersions.length - prunedVersions.length;

    await ctx.db.patch(args.serverId, {
      previousVersions: prunedVersions,
    });

    return { pruned: prunedCount };
  },
});
