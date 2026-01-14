"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

// Initialize Claude client
let claudeClient: Anthropic | null = null;

function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    claudeClient = new Anthropic({ apiKey });
  }
  return claudeClient;
}

/**
 * Parse JSON from Claude response, handling markdown code blocks and prefixed text
 */
function parseClaudeJSON<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Try direct parse first
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find a complete JSON object, handling nested braces
    const startIdx = jsonStr.indexOf("{");
    if (startIdx !== -1) {
      let braceCount = 0;
      let endIdx = -1;
      for (let i = startIdx; i < jsonStr.length; i++) {
        if (jsonStr[i] === "{") braceCount++;
        if (jsonStr[i] === "}") braceCount--;
        if (braceCount === 0) {
          endIdx = i;
          break;
        }
      }
      if (endIdx !== -1) {
        const jsonCandidate = jsonStr.slice(startIdx, endIdx + 1);
        try {
          return JSON.parse(jsonCandidate);
        } catch {
          // Fall through
        }
      }
    }

    // Last resort: try regex match
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        // Fall through
      }
    }

    throw new Error(
      `Failed to parse Claude response as JSON: ${jsonStr.slice(0, 100)}...`
    );
  }
}

// System prompt that enforces JSON output
const SKILL_GENERATION_SYSTEM = `You are a JSON generator. You ONLY output valid JSON objects. Never output code, markdown, or explanations. Just pure JSON.`;

// User prompt template - more structured to guide JSON output
const SKILL_GENERATION_USER = `Generate a JSON object for a Claude Code skill with this purpose: {DESCRIPTION}

The JSON must have exactly this structure (fill in the values):
{"name":"<kebab-case-name>","description":"<one-sentence-description>","files":{"skillMd":"---\\nname: <name>\\ndescription: <description>\\n---\\n\\n# <Title>\\n\\n<Instructions for using this skill>\\n\\n## When to Use\\n\\n<When to use this skill>","scripts":[],"references":[],"assets":[]},"metadata":{"license":"MIT","version":"1.0"}}

Output ONLY the JSON object with filled values. No other text.`;

// System prompt for skill refinement
const SKILL_REFINEMENT_SYSTEM = `You refine Claude Code skills. Output ONLY valid JSON, nothing else.

Required structure:
{
  "name": "kebab-case-name",
  "description": "One sentence description",
  "files": {
    "skillMd": "---\\nname: name\\ndescription: desc\\n---\\n\\n# Title\\n\\nContent here.",
    "scripts": [],
    "references": [],
    "assets": []
  },
  "metadata": { "license": "MIT", "version": "1.0" },
  "changesSummary": "What was changed"
}

Rules:
- Output raw JSON only
- skillMd must start with "---\\n"
- Use \\n for newlines in strings
- Preserve existing functionality unless asked to change it`;

/**
 * Ensure skillMd has valid YAML frontmatter
 * If missing, create proper frontmatter from the skill data
 */
function ensureValidSkillMd(skillMd: string, name: string, description: string): string {
  const trimmed = skillMd.trim();

  // Check if it starts with YAML frontmatter
  if (trimmed.startsWith("---")) {
    return trimmed;
  }

  // If not, wrap the content with proper frontmatter
  console.log("skillMd missing frontmatter, adding it. Original start:", trimmed.slice(0, 100));

  const frontmatter = `---
name: ${name}
description: ${description}
license: MIT
metadata:
  version: "1.0"
---

`;

  return frontmatter + trimmed;
}

interface GeneratedSkill {
  name: string;
  description: string;
  files: {
    skillMd: string;
    scripts?: Array<{ name: string; content: string; language: string }>;
    references?: Array<{ name: string; content: string }>;
    assets?: Array<{ name: string; content: string; type: string }>;
  };
  metadata: {
    license?: string;
    version: string;
    author?: string;
    compatibility?: string;
    allowedTools?: string[];
  };
}

/**
 * Generate a new skill from natural language description
 */
export const generateSkill = action({
  args: {
    userId: v.id("users"),
    description: v.string(),
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ skillId: string }> => {
    const client = getClaudeClient();

    // Build user prompt
    let userPrompt = SKILL_GENERATION_USER.replace("{DESCRIPTION}", args.description);

    // If using a template, include it as context
    if (args.templateId) {
      userPrompt += `\n\nNote: Base this on a template style but customize based on the description above.`;
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0, // Use deterministic output for JSON
      system: SKILL_GENERATION_SYSTEM,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const generated = parseClaudeJSON<GeneratedSkill>(textContent.text);

    // Validate the generated skill
    if (!generated.name || !generated.description || !generated.files?.skillMd) {
      throw new Error("Invalid skill generated: missing required fields");
    }

    // Ensure skillMd has valid frontmatter
    const validSkillMd = ensureValidSkillMd(
      generated.files.skillMd,
      generated.name,
      generated.description
    );

    // Create the skill in the database
    const skillId = await ctx.runMutation(api.skills.createSkill, {
      userId: args.userId,
      name: generated.name,
      description: generated.description,
      files: {
        skillMd: validSkillMd,
        scripts: generated.files.scripts || [],
        references: generated.files.references || [],
        assets: generated.files.assets || [],
      },
      metadata: {
        license: generated.metadata?.license,
        version: generated.metadata?.version || "1.0",
        author: generated.metadata?.author,
        compatibility: generated.metadata?.compatibility,
        allowedTools: generated.metadata?.allowedTools,
      },
      templateId: args.templateId,
    });

    return { skillId: skillId.toString() };
  },
});

/**
 * Refine an existing skill based on user feedback
 */
export const refineSkill = action({
  args: {
    skillId: v.id("skills"),
    feedback: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; changesSummary: string }> => {
    // Get current skill
    const skill = await ctx.runQuery(api.skills.getSkill, {
      skillId: args.skillId,
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const client = getClaudeClient();

    const currentSkillJson = JSON.stringify(
      {
        name: skill.name,
        description: skill.description,
        files: skill.files,
        metadata: skill.metadata,
      },
      null,
      2
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      system: SKILL_REFINEMENT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Current skill:\n${currentSkillJson}\n\nRequested changes:\n${args.feedback}\n\nOutput the updated skill as JSON only.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const refined = parseClaudeJSON<GeneratedSkill & { changesSummary: string }>(
      textContent.text
    );

    // Ensure skillMd has valid frontmatter
    const validSkillMd = ensureValidSkillMd(
      refined.files.skillMd,
      refined.name,
      refined.description
    );

    // Update the skill
    await ctx.runMutation(api.skills.updateSkill, {
      skillId: args.skillId,
      name: refined.name,
      description: refined.description,
      files: {
        skillMd: validSkillMd,
        scripts: refined.files.scripts || [],
        references: refined.files.references || [],
        assets: refined.files.assets || [],
      },
      metadata: {
        license: refined.metadata?.license,
        version: refined.metadata?.version || "1.0",
        author: refined.metadata?.author,
        compatibility: refined.metadata?.compatibility,
        allowedTools: refined.metadata?.allowedTools,
      },
      changeDescription: refined.changesSummary || "Refined based on feedback",
    });

    return {
      success: true,
      changesSummary: refined.changesSummary || "Skill updated successfully",
    };
  },
});

/**
 * Regenerate a specific section of a skill
 */
export const regenerateSection = action({
  args: {
    skillId: v.id("skills"),
    section: v.union(
      v.literal("instructions"),
      v.literal("scripts"),
      v.literal("references")
    ),
    guidance: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const skill = await ctx.runQuery(api.skills.getSkill, {
      skillId: args.skillId,
    });

    if (!skill) {
      throw new Error("Skill not found");
    }

    const client = getClaudeClient();

    let sectionPrompt = "";
    switch (args.section) {
      case "instructions":
        sectionPrompt = `Regenerate the SKILL.md instructions section. Keep the frontmatter but improve/expand the body content with clearer, more actionable instructions.`;
        break;
      case "scripts":
        sectionPrompt = `Generate or improve the scripts for this skill. Create Python, Bash, or JavaScript scripts that would be useful for this skill's purpose.`;
        break;
      case "references":
        sectionPrompt = `Generate or improve the reference documentation for this skill. Create detailed guides, examples, or supporting documentation.`;
        break;
    }

    if (args.guidance) {
      sectionPrompt += `\n\nAdditional guidance: ${args.guidance}`;
    }

    const currentSkillJson = JSON.stringify(
      {
        name: skill.name,
        description: skill.description,
        files: skill.files,
        metadata: skill.metadata,
      },
      null,
      2
    );

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      system: SKILL_REFINEMENT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `${sectionPrompt}\n\nCurrent skill:\n${currentSkillJson}\n\nOutput the updated skill as JSON only.`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    const updated = parseClaudeJSON<GeneratedSkill>(textContent.text);

    // Ensure skillMd has valid frontmatter
    const validSkillMd = ensureValidSkillMd(
      updated.files.skillMd,
      updated.name || skill.name,
      updated.description || skill.description
    );

    await ctx.runMutation(api.skills.updateSkill, {
      skillId: args.skillId,
      files: {
        skillMd: validSkillMd,
        scripts: updated.files.scripts || [],
        references: updated.files.references || [],
        assets: updated.files.assets || [],
      },
      changeDescription: `Regenerated ${args.section}`,
    });

    return { success: true };
  },
});
