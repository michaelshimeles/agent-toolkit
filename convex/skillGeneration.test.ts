/**
 * Tests for Skill Generation
 *
 * These tests verify the JSON parsing logic and skill generation utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Copy of parseClaudeJSON for testing (from convex/skillGeneration.ts)
// ============================================================================

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

// ============================================================================
// Tests for parseClaudeJSON
// ============================================================================

describe("parseClaudeJSON", () => {
  describe("direct JSON parsing", () => {
    it("should parse clean JSON object", () => {
      const json = '{"name": "test-skill", "description": "A test skill"}';
      const result = parseClaudeJSON<{ name: string; description: string }>(json);

      expect(result.name).toBe("test-skill");
      expect(result.description).toBe("A test skill");
    });

    it("should parse JSON with whitespace", () => {
      const json = `
        {
          "name": "test-skill",
          "description": "A test skill"
        }
      `;
      const result = parseClaudeJSON<{ name: string; description: string }>(json);

      expect(result.name).toBe("test-skill");
    });

    it("should parse JSON arrays", () => {
      const json = '[{"name": "item1"}, {"name": "item2"}]';
      const result = parseClaudeJSON<Array<{ name: string }>>(json);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("item1");
    });
  });

  describe("markdown code block extraction", () => {
    it("should extract JSON from ```json code block", () => {
      const text = `Here's the skill:

\`\`\`json
{"name": "code-review", "description": "Code review skill"}
\`\`\`

That's the skill!`;

      const result = parseClaudeJSON<{ name: string; description: string }>(text);

      expect(result.name).toBe("code-review");
      expect(result.description).toBe("Code review skill");
    });

    it("should extract JSON from ``` code block without language", () => {
      const text = `\`\`\`
{"name": "test", "value": 123}
\`\`\``;

      const result = parseClaudeJSON<{ name: string; value: number }>(text);

      expect(result.name).toBe("test");
      expect(result.value).toBe(123);
    });

    it("should handle code block with extra whitespace", () => {
      const text = `\`\`\`json

  {"name": "spaced"}

\`\`\``;

      const result = parseClaudeJSON<{ name: string }>(text);

      expect(result.name).toBe("spaced");
    });
  });

  describe("text with embedded JSON", () => {
    it("should extract JSON from text with prefix", () => {
      const text = `Sure! Here's the skill you requested:

{"name": "my-skill", "description": "A helpful skill"}`;

      const result = parseClaudeJSON<{ name: string; description: string }>(text);

      expect(result.name).toBe("my-skill");
    });

    it("should extract JSON from text with suffix", () => {
      const text = `{"name": "my-skill", "description": "A helpful skill"}

Let me know if you need any changes!`;

      const result = parseClaudeJSON<{ name: string; description: string }>(text);

      expect(result.name).toBe("my-skill");
    });

    it("should extract JSON from text with both prefix and suffix", () => {
      const text = `Here's the generated skill:

{"name": "my-skill", "files": {"skillMd": "content"}}

The skill includes all the requested features.`;

      const result = parseClaudeJSON<{ name: string; files: { skillMd: string } }>(text);

      expect(result.name).toBe("my-skill");
      expect(result.files.skillMd).toBe("content");
    });
  });

  describe("nested JSON handling", () => {
    it("should correctly parse deeply nested objects", () => {
      const json = `{
        "name": "complex-skill",
        "files": {
          "skillMd": "# Content",
          "scripts": [
            {"name": "script.py", "content": "print('hello')"}
          ]
        },
        "metadata": {
          "nested": {
            "deep": {
              "value": true
            }
          }
        }
      }`;

      const result = parseClaudeJSON<any>(json);

      expect(result.name).toBe("complex-skill");
      expect(result.files.scripts[0].name).toBe("script.py");
      expect(result.metadata.nested.deep.value).toBe(true);
    });

    it("should handle JSON with braces in string values", () => {
      const json = `{
        "name": "test",
        "code": "function test() { return { key: 'value' }; }"
      }`;

      const result = parseClaudeJSON<{ name: string; code: string }>(json);

      expect(result.name).toBe("test");
      expect(result.code).toContain("{ return { key:");
    });
  });

  describe("error cases", () => {
    it("should throw error for pure markdown without JSON", () => {
      const text = `# Code Review Summary

## Issues Found
- Issue 1
- Issue 2

## Recommendations
Follow best practices.`;

      expect(() => parseClaudeJSON(text)).toThrow("Failed to parse Claude response as JSON");
    });

    it("should throw error for empty string", () => {
      expect(() => parseClaudeJSON("")).toThrow();
    });

    it("should throw error for invalid JSON syntax", () => {
      const invalidJson = '{"name": "test", "missing": }';

      expect(() => parseClaudeJSON(invalidJson)).toThrow();
    });

    it("should throw error for truncated JSON", () => {
      const truncated = '{"name": "test", "files": {"skillMd": "content"';

      expect(() => parseClaudeJSON(truncated)).toThrow();
    });

    it("should include preview of problematic text in error", () => {
      const badText = "This is not JSON at all, just plain text content that goes on and on";

      expect(() => parseClaudeJSON(badText)).toThrow(/Failed to parse Claude response/);
    });
  });

  describe("edge cases", () => {
    it("should handle escaped characters in JSON", () => {
      const json = '{"content": "Line 1\\nLine 2\\tTabbed"}';
      const result = parseClaudeJSON<{ content: string }>(json);

      expect(result.content).toBe("Line 1\nLine 2\tTabbed");
    });

    it("should handle unicode in JSON", () => {
      const json = '{"name": "emoji-skill", "icon": "🚀"}';
      const result = parseClaudeJSON<{ name: string; icon: string }>(json);

      expect(result.icon).toBe("🚀");
    });

    it("should handle JSON with null values", () => {
      const json = '{"name": "test", "optional": null}';
      const result = parseClaudeJSON<{ name: string; optional: null }>(json);

      expect(result.optional).toBeNull();
    });

    it("should handle JSON with boolean values", () => {
      const json = '{"active": true, "deprecated": false}';
      const result = parseClaudeJSON<{ active: boolean; deprecated: boolean }>(json);

      expect(result.active).toBe(true);
      expect(result.deprecated).toBe(false);
    });

    it("should handle JSON with numeric values", () => {
      const json = '{"count": 42, "rate": 3.14, "negative": -10}';
      const result = parseClaudeJSON<{ count: number; rate: number; negative: number }>(json);

      expect(result.count).toBe(42);
      expect(result.rate).toBeCloseTo(3.14);
      expect(result.negative).toBe(-10);
    });
  });

  describe("real-world Claude response scenarios", () => {
    it("should handle typical successful Claude JSON response", () => {
      // Simulating what Claude should return with our prefill
      const response = `"name": "code-review-skill",
  "description": "A skill for performing comprehensive code reviews",
  "files": {
    "skillMd": "---\\nname: code-review-skill\\ndescription: Performs code reviews\\n---\\n\\n# Instructions\\n\\nReview the code carefully.",
    "scripts": [],
    "references": [],
    "assets": []
  },
  "metadata": {
    "version": "1.0",
    "license": "MIT"
  }
}`;

      // When we prepend "{", it should parse correctly
      const fullResponse = "{" + response;
      const result = parseClaudeJSON<any>(fullResponse);

      expect(result.name).toBe("code-review-skill");
      expect(result.files.skillMd).toContain("code-review-skill");
    });

    it("should handle Claude response with thinking before JSON", () => {
      const response = `I'll create a skill for you.

Let me structure this properly...

{
  "name": "test-skill",
  "description": "A test skill",
  "files": {
    "skillMd": "# Test",
    "scripts": [],
    "references": [],
    "assets": []
  },
  "metadata": {"version": "1.0"}
}`;

      const result = parseClaudeJSON<any>(response);

      expect(result.name).toBe("test-skill");
    });

    it("should FAIL on Claude response that is pure markdown (our current bug)", () => {
      // This is the actual problematic response pattern
      const badResponse = `
# Code Review Summary
[Overall assessment]

## Critical Issues 🚨
[Security vulnerabilities and bugs]

## Recommendations
Follow best practices.`;

      // This should throw because there's no JSON
      expect(() => parseClaudeJSON(badResponse)).toThrow("Failed to parse Claude response as JSON");
    });
  });
});

// ============================================================================
// Tests for Skill Validation
// ============================================================================

describe("Skill Validation", () => {
  function validateSkillName(name: string): { valid: boolean; error?: string } {
    if (!name) return { valid: false, error: "Name is required" };
    if (name.length > 64) return { valid: false, error: "Name must be 64 characters or less" };
    if (!/^[a-z0-9-]+$/.test(name)) {
      return { valid: false, error: "Name must be lowercase letters, numbers, and hyphens only" };
    }
    if (name.startsWith("-") || name.endsWith("-")) {
      return { valid: false, error: "Name cannot start or end with a hyphen" };
    }
    return { valid: true };
  }

  function validateSkillDescription(description: string): { valid: boolean; error?: string } {
    if (!description) return { valid: false, error: "Description is required" };
    if (description.length > 1024) {
      return { valid: false, error: "Description must be 1024 characters or less" };
    }
    return { valid: true };
  }

  describe("validateSkillName", () => {
    it("should accept valid names", () => {
      expect(validateSkillName("my-skill").valid).toBe(true);
      expect(validateSkillName("code-review").valid).toBe(true);
      expect(validateSkillName("test123").valid).toBe(true);
      expect(validateSkillName("a").valid).toBe(true);
    });

    it("should reject names with uppercase", () => {
      expect(validateSkillName("MySkill").valid).toBe(false);
      expect(validateSkillName("mySkill").valid).toBe(false);
    });

    it("should reject names with special characters", () => {
      expect(validateSkillName("my_skill").valid).toBe(false);
      expect(validateSkillName("my.skill").valid).toBe(false);
      expect(validateSkillName("my skill").valid).toBe(false);
    });

    it("should reject names over 64 characters", () => {
      const longName = "a".repeat(65);
      expect(validateSkillName(longName).valid).toBe(false);
    });

    it("should reject names starting or ending with hyphen", () => {
      expect(validateSkillName("-my-skill").valid).toBe(false);
      expect(validateSkillName("my-skill-").valid).toBe(false);
    });

    it("should reject empty names", () => {
      expect(validateSkillName("").valid).toBe(false);
    });
  });

  describe("validateSkillDescription", () => {
    it("should accept valid descriptions", () => {
      expect(validateSkillDescription("A helpful skill").valid).toBe(true);
      expect(validateSkillDescription("Performs code reviews and provides feedback").valid).toBe(true);
    });

    it("should reject descriptions over 1024 characters", () => {
      const longDesc = "a".repeat(1025);
      expect(validateSkillDescription(longDesc).valid).toBe(false);
    });

    it("should reject empty descriptions", () => {
      expect(validateSkillDescription("").valid).toBe(false);
    });
  });
});

// ============================================================================
// Tests for ensureValidSkillMd
// ============================================================================

describe("ensureValidSkillMd", () => {
  function ensureValidSkillMd(skillMd: string, name: string, description: string): string {
    const trimmed = skillMd.trim();

    // Check if it starts with YAML frontmatter
    if (trimmed.startsWith("---")) {
      return trimmed;
    }

    // If not, wrap the content with proper frontmatter
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

  it("should return content unchanged if it already has frontmatter", () => {
    const content = `---
name: test-skill
description: Test
---

# Instructions`;

    const result = ensureValidSkillMd(content, "other-name", "Other description");

    expect(result).toBe(content.trim());
    expect(result).toContain("name: test-skill"); // Original name preserved
  });

  it("should add frontmatter if missing", () => {
    const content = `# Instructions

This is the skill content without frontmatter.`;

    const result = ensureValidSkillMd(content, "my-skill", "A helpful skill");

    expect(result.startsWith("---")).toBe(true);
    expect(result).toContain("name: my-skill");
    expect(result).toContain("description: A helpful skill");
    expect(result).toContain("# Instructions");
  });

  it("should handle empty content", () => {
    const result = ensureValidSkillMd("", "empty-skill", "Empty skill description");

    expect(result.startsWith("---")).toBe(true);
    expect(result).toContain("name: empty-skill");
  });

  it("should handle content with leading whitespace", () => {
    const content = `

   # Instructions with leading whitespace`;

    const result = ensureValidSkillMd(content, "whitespace-skill", "Description");

    expect(result.startsWith("---")).toBe(true);
    expect(result).toContain("# Instructions");
  });

  it("should not double-add frontmatter", () => {
    const content = `---
name: existing
description: Existing skill
---

Content`;

    const result = ensureValidSkillMd(content, "new-name", "New description");
    const frontmatterCount = (result.match(/^---/gm) || []).length;

    // Valid frontmatter has 2 markers: opening --- and closing ---
    expect(frontmatterCount).toBe(2);
    // Make sure we didn't add extra frontmatter (would be 4 markers)
    expect(result).not.toContain("name: new-name"); // Original preserved
    expect(result).toContain("name: existing");
  });
});

describe("SKILL.md Frontmatter Parsing", () => {
  function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } | null {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) return null;

    const frontmatterStr = match[1];
    const body = match[2];

    // Simple YAML parsing (for testing purposes)
    const frontmatter: Record<string, any> = {};
    const lines = frontmatterStr.split("\n");

    for (const line of lines) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        let value = line.slice(colonIdx + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        frontmatter[key] = value;
      }
    }

    return { frontmatter, body };
  }

  it("should parse valid frontmatter", () => {
    const content = `---
name: my-skill
description: A helpful skill
---

# Instructions

Do helpful things.`;

    const result = parseFrontmatter(content);

    expect(result).not.toBeNull();
    expect(result!.frontmatter.name).toBe("my-skill");
    expect(result!.frontmatter.description).toBe("A helpful skill");
    expect(result!.body).toContain("# Instructions");
  });

  it("should handle quoted values", () => {
    const content = `---
name: "my-skill"
description: 'A skill with "quotes"'
---

Body`;

    const result = parseFrontmatter(content);

    expect(result!.frontmatter.name).toBe("my-skill");
  });

  it("should return null for content without frontmatter", () => {
    const content = `# Just a markdown file

No frontmatter here.`;

    expect(parseFrontmatter(content)).toBeNull();
  });

  it("should return null for incomplete frontmatter", () => {
    const content = `---
name: incomplete

Body without closing frontmatter`;

    expect(parseFrontmatter(content)).toBeNull();
  });
});
