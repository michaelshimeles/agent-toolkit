import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new A/B testing experiment for a skill
 */
export const createExperiment = mutation({
  args: {
    skillId: v.id("skills"),
    name: v.string(),
    controlVersionId: v.id("skillVersions"),
    treatmentVersionId: v.id("skillVersions"),
    trafficSplit: v.number(), // 0-100, percentage going to treatment
  },
  handler: async (ctx, args) => {
    // Validate skill exists
    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      throw new Error("Skill not found");
    }

    // Validate control version exists and belongs to this skill
    const controlVersion = await ctx.db.get(args.controlVersionId);
    if (!controlVersion || controlVersion.skillId !== args.skillId) {
      throw new Error("Control version not found or does not belong to this skill");
    }

    // Validate treatment version exists and belongs to this skill
    const treatmentVersion = await ctx.db.get(args.treatmentVersionId);
    if (!treatmentVersion || treatmentVersion.skillId !== args.skillId) {
      throw new Error("Treatment version not found or does not belong to this skill");
    }

    // Validate traffic split is between 0 and 100
    if (args.trafficSplit < 0 || args.trafficSplit > 100) {
      throw new Error("Traffic split must be between 0 and 100");
    }

    const now = Date.now();

    const experimentId = await ctx.db.insert("skillExperiments", {
      skillId: args.skillId,
      name: args.name,
      controlVersionId: args.controlVersionId,
      treatmentVersionId: args.treatmentVersionId,
      trafficSplit: args.trafficSplit,
      status: "draft",
      createdAt: now,
    });

    return experimentId;
  },
});

/**
 * Start an experiment - changes status from draft to running
 */
export const startExperiment = mutation({
  args: {
    experimentId: v.id("skillExperiments"),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    if (experiment.status !== "draft") {
      throw new Error("Experiment must be in draft status to start");
    }

    // Check no other running experiment for the same skill
    const runningExperiments = await ctx.db
      .query("skillExperiments")
      .withIndex("by_skill", (q) => q.eq("skillId", experiment.skillId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect();

    if (runningExperiments.length > 0) {
      throw new Error("Another experiment is already running for this skill");
    }

    const now = Date.now();

    // Update experiment status
    await ctx.db.patch(args.experimentId, {
      status: "running",
      startedAt: now,
    });

    // Initialize experiment results for control variant
    await ctx.db.insert("experimentResults", {
      experimentId: args.experimentId,
      versionId: experiment.controlVersionId,
      variant: "control",
      totalInvocations: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      avgTokens: 0,
      updatedAt: now,
    });

    // Initialize experiment results for treatment variant
    await ctx.db.insert("experimentResults", {
      experimentId: args.experimentId,
      versionId: experiment.treatmentVersionId,
      variant: "treatment",
      totalInvocations: 0,
      successCount: 0,
      errorCount: 0,
      avgLatencyMs: 0,
      avgTokens: 0,
      updatedAt: now,
    });

    return args.experimentId;
  },
});

/**
 * Stop a running experiment
 */
export const stopExperiment = mutation({
  args: {
    experimentId: v.id("skillExperiments"),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    if (experiment.status !== "running") {
      throw new Error("Experiment must be running to stop");
    }

    const now = Date.now();

    await ctx.db.patch(args.experimentId, {
      status: "completed",
      endedAt: now,
    });

    return args.experimentId;
  },
});

/**
 * Record metrics for an experiment variant
 */
export const recordExperimentMetrics = mutation({
  args: {
    experimentId: v.id("skillExperiments"),
    variant: v.union(v.literal("control"), v.literal("treatment")),
    metrics: v.object({
      invocations: v.number(),
      successes: v.number(),
      errors: v.number(),
      latencyMs: v.number(),
      tokens: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    if (experiment.status !== "running") {
      throw new Error("Can only record metrics for running experiments");
    }

    // Find the experiment results record for this variant
    const results = await ctx.db
      .query("experimentResults")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .filter((q) => q.eq(q.field("variant"), args.variant))
      .first();

    if (!results) {
      throw new Error("Experiment results not found for this variant");
    }

    const now = Date.now();

    // Calculate new totals
    const newInvocations = results.totalInvocations + args.metrics.invocations;
    const newSuccesses = results.successCount + args.metrics.successes;
    const newErrors = results.errorCount + args.metrics.errors;

    // For running averages, we need to track totals
    // Use weighted average approach - multiply incoming metrics by invocation count
    const totalLatencyMs = results.avgLatencyMs * results.totalInvocations + args.metrics.latencyMs * args.metrics.invocations;
    const totalTokens = results.avgTokens * results.totalInvocations + args.metrics.tokens * args.metrics.invocations;

    // Recalculate averages
    const newAvgLatencyMs = newInvocations > 0 ? totalLatencyMs / newInvocations : 0;
    const newAvgTokens = newInvocations > 0 ? totalTokens / newInvocations : 0;

    await ctx.db.patch(results._id, {
      totalInvocations: newInvocations,
      successCount: newSuccesses,
      errorCount: newErrors,
      avgLatencyMs: newAvgLatencyMs,
      avgTokens: newAvgTokens,
      updatedAt: now,
    });

    return results._id;
  },
});

/**
 * Get all experiments for a skill
 */
export const getExperimentsBySkill = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const experiments = await ctx.db
      .query("skillExperiments")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .collect();

    return experiments.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get experiment results for both variants
 */
export const getExperimentResults = query({
  args: { experimentId: v.id("skillExperiments") },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) {
      throw new Error("Experiment not found");
    }

    const results = await ctx.db
      .query("experimentResults")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();

    const control = results.find((r) => r.variant === "control") || null;
    const treatment = results.find((r) => r.variant === "treatment") || null;

    return {
      experiment,
      control,
      treatment,
    };
  },
});

/**
 * Get the currently running experiment for a skill, if any
 */
export const getActiveExperiment = query({
  args: { skillId: v.id("skills") },
  handler: async (ctx, args) => {
    const experiment = await ctx.db
      .query("skillExperiments")
      .withIndex("by_skill", (q) => q.eq("skillId", args.skillId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .first();

    if (!experiment) {
      return null;
    }

    // Also fetch the results
    const results = await ctx.db
      .query("experimentResults")
      .withIndex("by_experiment", (q) => q.eq("experimentId", experiment._id))
      .collect();

    const control = results.find((r) => r.variant === "control") || null;
    const treatment = results.find((r) => r.variant === "treatment") || null;

    return {
      experiment,
      control,
      treatment,
    };
  },
});

/**
 * Get a single experiment by ID with its results
 */
export const getExperimentById = query({
  args: { experimentId: v.id("skillExperiments") },
  handler: async (ctx, args) => {
    const experiment = await ctx.db.get(args.experimentId);
    if (!experiment) {
      return null;
    }

    // Fetch the skill for additional context
    const skill = await ctx.db.get(experiment.skillId);

    // Fetch the version details
    const controlVersion = await ctx.db.get(experiment.controlVersionId);
    const treatmentVersion = await ctx.db.get(experiment.treatmentVersionId);

    // Fetch the results
    const results = await ctx.db
      .query("experimentResults")
      .withIndex("by_experiment", (q) => q.eq("experimentId", args.experimentId))
      .collect();

    const control = results.find((r) => r.variant === "control") || null;
    const treatment = results.find((r) => r.variant === "treatment") || null;

    return {
      experiment,
      skill,
      controlVersion,
      treatmentVersion,
      results: {
        control,
        treatment,
      },
    };
  },
});
