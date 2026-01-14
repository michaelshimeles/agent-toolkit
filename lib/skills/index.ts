/**
 * Skills Library
 * Exports all skill-related utilities
 */

export * from "./templates";
export * from "./validator";
export * from "./github-deploy";

/**
 * Claude prompt for generating skills from natural language
 */
export const SKILL_GENERATION_PROMPT = `You are an expert at creating Agent Skills for AI agents like Claude Code.

Agent Skills follow the official specification at https://agentskills.io:
- Skills are folders containing a SKILL.md file and optional scripts/references/assets
- SKILL.md has YAML frontmatter with name and description (required)
- The name must be lowercase, hyphens only, max 64 characters
- The description must be max 1024 characters and explain WHAT the skill does AND WHEN to use it
- Keep SKILL.md body under 500 lines; use references for detailed content

When generating a skill:
1. Create a clear, focused name that describes the skill's purpose
2. Write a comprehensive description that helps agents identify when to use it
3. Structure instructions as clear, actionable steps
4. Include edge cases and error handling guidance
5. Generate scripts only when executable code is genuinely needed
6. Use references for lengthy documentation or detailed guides
7. Follow security best practices (never include real credentials)

CRITICAL: You MUST respond with ONLY a JSON object. No explanations, no introductory text, no markdown formatting.
Your entire response must be a valid JSON object starting with { and ending with }.

Output format:
{
  "name": "skill-name",
  "description": "A comprehensive description explaining what this skill does and when an agent should use it.",
  "files": {
    "skillMd": "---\\nname: skill-name\\ndescription: ...\\nlicense: MIT\\nmetadata:\\n  version: \\"1.0\\"\\n---\\n\\n# Instructions\\n\\n...",
    "scripts": [
      {
        "name": "script.py",
        "content": "# Python script content...",
        "language": "python"
      }
    ],
    "references": [
      {
        "name": "GUIDE.md",
        "content": "# Detailed Guide\\n\\n..."
      }
    ],
    "assets": []
  },
  "metadata": {
    "license": "MIT",
    "version": "1.0",
    "compatibility": "Designed for Claude Code"
  }
}

Important notes:
- scripts, references, and assets arrays can be empty [] if not needed
- Script languages can be: "python", "bash", or "javascript"
- The skillMd field must be valid YAML frontmatter followed by markdown content
- Escape newlines as \\n in the JSON string values
- Do not include any hardcoded API keys, secrets, or credentials`;

/**
 * Claude prompt for refining existing skills
 */
export const SKILL_REFINEMENT_PROMPT = `You are helping refine an existing Agent Skill. The user has provided feedback on changes they want.

Current skill structure and content will be provided. Apply the user's requested changes while:
1. Maintaining the Agent Skills specification format
2. Keeping the skill name valid (lowercase, hyphens, max 64 chars)
3. Preserving existing functionality unless explicitly asked to change it
4. Keeping the description informative about WHAT and WHEN

CRITICAL: You MUST respond with ONLY a JSON object containing the updated skill.
Your entire response must be a valid JSON object starting with { and ending with }.

Output the complete updated skill in this format:
{
  "name": "skill-name",
  "description": "Updated description...",
  "files": {
    "skillMd": "---\\nname: ...\\n---\\n\\n...",
    "scripts": [...],
    "references": [...],
    "assets": [...]
  },
  "metadata": {
    "license": "MIT",
    "version": "1.0"
  },
  "changesSummary": "Brief description of what was changed"
}`;

/**
 * Types for skill generation
 */
export interface GeneratedSkill {
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

export interface RefinedSkill extends GeneratedSkill {
  changesSummary: string;
}
