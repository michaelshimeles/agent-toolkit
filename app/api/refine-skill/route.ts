import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { getUserAnthropicApiKeyByClerkId } from "@/lib/user-api-key";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "@/convex/_generated/dataModel";

// System prompt for skill refinement
const SKILL_REFINEMENT_SYSTEM = `You are a JSON-only skill editor. You modify Claude Code skills and return the complete updated skill as a JSON object.

CRITICAL: Your response must be ONLY a valid JSON object. No markdown, no explanations, no code blocks - just raw JSON starting with { and ending with }.

Required JSON structure:
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
  "changesSummary": "Brief description of what was changed"
}

Rules:
- Return ONLY the JSON object, nothing else
- skillMd must start with "---\\n" (YAML frontmatter)
- Use \\n for newlines in strings
- Apply the requested changes to the skill
- Preserve existing functionality unless explicitly asked to change it`;

/**
 * Parse JSON from Claude response
 */
function parseClaudeJSON<T>(text: string): T {
  let jsonStr = text.trim();

  // Remove markdown code blocks
  const codeBlockMatch = jsonStr.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // Find the first { character
  const firstBrace = jsonStr.indexOf("{");
  if (firstBrace > 0) {
    jsonStr = jsonStr.slice(firstBrace);
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Try to find a complete JSON object
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
        return JSON.parse(jsonCandidate);
      }
    }
    throw new Error(`Failed to parse JSON response`);
  }
}

/**
 * Ensure skillMd has valid YAML frontmatter
 */
function ensureValidSkillMd(skillMd: string, name: string, description: string): string {
  const trimmed = skillMd.trim();

  if (trimmed.startsWith("---")) {
    return trimmed;
  }

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
  changesSummary?: string;
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { skillId, feedback } = await req.json();
    if (!skillId || !feedback) {
      return NextResponse.json(
        { error: "Missing skillId or feedback" },
        { status: 400 }
      );
    }

    // Get user's API key
    const userApiKey = await getUserAnthropicApiKeyByClerkId(clerkId);
    const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key configured. Please add your Anthropic API key in settings." },
        { status: 400 }
      );
    }

    // Get the skill from Convex
    const convex = getConvexClient();
    const skill = await convex.query(api.skills.getSkill, {
      skillId: skillId as Id<"skills">,
    });

    if (!skill) {
      return NextResponse.json({ error: "Skill not found" }, { status: 404 });
    }

    // Create Anthropic client
    const client = new Anthropic({ apiKey });

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

    // Call Claude to refine the skill
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      temperature: 0,
      system: SKILL_REFINEMENT_SYSTEM,
      messages: [
        {
          role: "user",
          content: `You are editing a Claude Code skill. Apply the requested changes and return the COMPLETE updated skill as a JSON object.

CURRENT SKILL JSON:
${currentSkillJson}

CHANGES TO APPLY:
${feedback}

IMPORTANT: Output ONLY the updated skill as a raw JSON object. Do not write code reviews, summaries, or explanations. Just the JSON.`,
        },
        {
          role: "assistant",
          content: '{"name":',
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the response
    const refined = parseClaudeJSON<GeneratedSkill>(
      '{"name":' + textContent.text
    );

    // Ensure skillMd has valid frontmatter
    const validSkillMd = ensureValidSkillMd(
      refined.files.skillMd,
      refined.name,
      refined.description
    );

    // Update the skill in Convex
    await convex.mutation(api.skills.updateSkill, {
      skillId: skillId as Id<"skills">,
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

    return NextResponse.json({
      success: true,
      changesSummary: refined.changesSummary || "Skill updated successfully",
    });
  } catch (error: unknown) {
    console.error("Refine skill error:", error);

    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    // Check for Anthropic billing errors
    if (errorMessage.includes("credit balance")) {
      return NextResponse.json(
        { error: "The AI provider (Anthropic) has insufficient credits. Please check your API key billing." },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
