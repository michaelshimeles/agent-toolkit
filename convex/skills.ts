import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * List all skills for a user
 */
export const listUserSkills = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return skills.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

/**
 * Get a single skill by ID
 */
export const getSkill = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.skillId);
  },
});

/**
 * Get skill by name for a user
 */
export const getSkillByName = query({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skills")
      .withIndex("by_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();
  },
});

/**
 * Create a new skill
 */
export const createSkill = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    files: v.object({
      skillMd: v.string(),
      scripts: v.optional(
        v.array(
          v.object({
            name: v.string(),
            content: v.string(),
            language: v.string(),
          })
        )
      ),
      references: v.optional(
        v.array(
          v.object({
            name: v.string(),
            content: v.string(),
          })
        )
      ),
      assets: v.optional(
        v.array(
          v.object({
            name: v.string(),
            content: v.string(),
            type: v.string(),
          })
        )
      ),
    }),
    metadata: v.object({
      license: v.optional(v.string()),
      version: v.string(),
      author: v.optional(v.string()),
      compatibility: v.optional(v.string()),
      allowedTools: v.optional(v.array(v.string())),
    }),
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if skill with same name exists
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_name", (q) =>
        q.eq("userId", args.userId).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error(`A skill named "${args.name}" already exists`);
    }

    const skillId = await ctx.db.insert("skills", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      status: "draft",
      files: args.files,
      metadata: args.metadata,
      templateId: args.templateId,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial version
    await ctx.db.insert("skillVersions", {
      skillId,
      version: 1,
      files: args.files,
      changeDescription: "Initial creation",
      createdAt: now,
    });

    return skillId;
  },
});

/**
 * Update a skill
 */
export const updateSkill = mutation({
  args: {
    skillId: v.id("skills"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    files: v.optional(
      v.object({
        skillMd: v.string(),
        scripts: v.optional(
          v.array(
            v.object({
              name: v.string(),
              content: v.string(),
              language: v.string(),
            })
          )
        ),
        references: v.optional(
          v.array(
            v.object({
              name: v.string(),
              content: v.string(),
            })
          )
        ),
        assets: v.optional(
          v.array(
            v.object({
              name: v.string(),
              content: v.string(),
              type: v.string(),
            })
          )
        ),
      })
    ),
    metadata: v.optional(
      v.object({
        license: v.optional(v.string()),
        version: v.string(),
        author: v.optional(v.string()),
        compatibility: v.optional(v.string()),
        allowedTools: v.optional(v.array(v.string())),
      })
    ),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    const now = Date.now();
    const updates: any = { updatedAt: now };

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.files !== undefined) updates.files = args.files;
    if (args.metadata !== undefined) updates.metadata = args.metadata;

    await ctx.db.patch(args.skillId, updates);

    // Create new version if files changed
    if (args.files) {
      // Get latest version number
      const versions = await ctx.db
        .query("skillVersions")
        .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
        .collect();

      const latestVersion = versions.reduce(
        (max, v) => Math.max(max, v.version),
        0
      );

      await ctx.db.insert("skillVersions", {
        skillId: args.skillId,
        version: latestVersion + 1,
        files: args.files,
        changeDescription: args.changeDescription || "Updated skill",
        createdAt: now,
      });
    }

    return args.skillId;
  },
});

/**
 * Delete a skill
 */
export const deleteSkill = mutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Delete all versions
    const versions = await ctx.db
      .query("skillVersions")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();

    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    // Delete the skill
    await ctx.db.delete(args.skillId);
  },
});

/**
 * Update skill deployment info
 */
export const updateDeployment = mutation({
  args: {
    skillId: v.id("skills"),
    githubRepo: v.string(),
    githubUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    await ctx.db.patch(args.skillId, {
      status: "deployed",
      githubRepo: args.githubRepo,
      githubUrl: args.githubUrl,
      deployedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Archive a skill
 */
export const archiveSkill = mutation({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    await ctx.db.patch(args.skillId, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

/**
 * Get version history for a skill
 */
export const getVersionHistory = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("skillVersions")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();

    return versions.sort((a, b) => b.version - a.version);
  },
});

/**
 * Get a specific version
 */
export const getVersion = query({
  args: { skillId: v.id("skills"), version: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("skillVersions")
      .withIndex("by_skill_version", (q) =>
        q.eq("skillId", args.skillId).eq("version", args.version)
      )
      .first();
  },
});

/**
 * Restore a previous version
 */
export const restoreVersion = mutation({
  args: { skillId: v.id("skills"), version: v.number() },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    const versionData = await ctx.db
      .query("skillVersions")
      .withIndex("by_skill_version", (q) =>
        q.eq("skillId", args.skillId).eq("version", args.version)
      )
      .first();

    if (!versionData) {
      throw new Error("Version not found");
    }

    const now = Date.now();

    // Update skill with restored files
    await ctx.db.patch(args.skillId, {
      files: versionData.files,
      updatedAt: now,
    });

    // Get latest version number
    const versions = await ctx.db
      .query("skillVersions")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();

    const latestVersion = versions.reduce(
      (max, v) => Math.max(max, v.version),
      0
    );

    // Create new version for the restore
    await ctx.db.insert("skillVersions", {
      skillId: args.skillId,
      version: latestVersion + 1,
      files: versionData.files,
      changeDescription: `Restored from version ${args.version}`,
      createdAt: now,
    });
  },
});
