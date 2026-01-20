/**
 * Skill Validator
 * Validates skills against the Agent Skills specification
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  "allowed-tools"?: string;
}

/**
 * Parse YAML frontmatter from SKILL.md content
 */
export function parseFrontmatter(content: string): {
  frontmatter: SkillFrontmatter | null;
  body: string;
  error?: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: null,
      body: content,
      error: "No valid YAML frontmatter found. SKILL.md must start with ---",
    };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    // Simple YAML parser for key-value pairs
    const frontmatter: Record<string, any> = {};
    const lines = yamlContent.split("\n");
    let currentKey = "";
    let inNestedObject = false;
    let nestedObject: Record<string, string> = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check for nested object start
      if (trimmed.endsWith(":") && !trimmed.includes(" ")) {
        if (inNestedObject && currentKey) {
          frontmatter[currentKey] = nestedObject;
          nestedObject = {};
        }
        currentKey = trimmed.slice(0, -1);
        inNestedObject = true;
        continue;
      }

      // Check for nested key-value
      if (inNestedObject && line.startsWith("  ")) {
        const nestedMatch = trimmed.match(/^(\w+):\s*(.*)$/);
        if (nestedMatch) {
          nestedObject[nestedMatch[1]] = nestedMatch[2].replace(/^["']|["']$/g, "");
        }
        continue;
      }

      // Check for top-level key-value
      const kvMatch = trimmed.match(/^([\w-]+):\s*(.*)$/);
      if (kvMatch) {
        if (inNestedObject && currentKey) {
          frontmatter[currentKey] = nestedObject;
          nestedObject = {};
          inNestedObject = false;
        }
        const key = kvMatch[1];
        let value = kvMatch[2].replace(/^["']|["']$/g, "");
        frontmatter[key] = value;
      }
    }

    // Handle final nested object
    if (inNestedObject && currentKey) {
      frontmatter[currentKey] = nestedObject;
    }

    return {
      frontmatter: frontmatter as SkillFrontmatter,
      body,
    };
  } catch (error) {
    return {
      frontmatter: null,
      body: content,
      error: `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validate skill name according to spec
 * - Max 64 characters
 * - Lowercase letters, numbers, and hyphens only
 * - Must not start or end with hyphen
 * - No consecutive hyphens
 */
export function validateName(name: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!name) {
    errors.push({
      field: "name",
      message: "Name is required",
      severity: "error",
    });
    return errors;
  }

  if (name.length > 64) {
    errors.push({
      field: "name",
      message: `Name must be 64 characters or less (current: ${name.length})`,
      severity: "error",
    });
  }

  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push({
      field: "name",
      message: "Name must contain only lowercase letters, numbers, and hyphens",
      severity: "error",
    });
  }

  if (name.startsWith("-") || name.endsWith("-")) {
    errors.push({
      field: "name",
      message: "Name must not start or end with a hyphen",
      severity: "error",
    });
  }

  if (/--/.test(name)) {
    errors.push({
      field: "name",
      message: "Name must not contain consecutive hyphens",
      severity: "error",
    });
  }

  return errors;
}

/**
 * Validate skill description according to spec
 * - Max 1024 characters
 * - Non-empty
 * - Should describe what AND when to use
 */
export function validateDescription(description: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!description) {
    errors.push({
      field: "description",
      message: "Description is required",
      severity: "error",
    });
    return errors;
  }

  if (description.length > 1024) {
    errors.push({
      field: "description",
      message: `Description must be 1024 characters or less (current: ${description.length})`,
      severity: "error",
    });
  }

  if (description.length < 20) {
    errors.push({
      field: "description",
      message: "Description should be more detailed (at least 20 characters)",
      severity: "warning",
    });
  }

  // Check for keywords that indicate when to use
  const whenKeywords = ["use when", "use this", "use for", "when", "for", "helps with"];
  const hasWhenClause = whenKeywords.some((kw) =>
    description.toLowerCase().includes(kw)
  );

  if (!hasWhenClause) {
    errors.push({
      field: "description",
      message: "Description should explain when to use this skill",
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate SKILL.md content length
 * - Recommended under 500 lines
 */
export function validateBodyLength(body: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = body.split("\n").length;

  if (lines > 500) {
    errors.push({
      field: "body",
      message: `SKILL.md body should be under 500 lines (current: ${lines}). Consider moving detailed content to reference files.`,
      severity: "warning",
    });
  }

  return errors;
}

/**
 * Validate script files
 */
export function validateScripts(
  scripts?: Array<{ name: string; content: string; language: string }>
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!scripts) return errors;

  const validExtensions: Record<string, string[]> = {
    python: [".py"],
    bash: [".sh", ".bash"],
    javascript: [".js", ".mjs"],
    typescript: [".ts"],
  };

  for (const script of scripts) {
    if (!script.name) {
      errors.push({
        field: "scripts",
        message: "Script file must have a name",
        severity: "error",
      });
      continue;
    }

    const extensions = validExtensions[script.language];
    if (extensions) {
      const hasValidExt = extensions.some((ext) => script.name.endsWith(ext));
      if (!hasValidExt) {
        errors.push({
          field: "scripts",
          message: `Script "${script.name}" should have extension ${extensions.join(" or ")} for ${script.language}`,
          severity: "warning",
        });
      }
    }

    if (!script.content || script.content.trim().length === 0) {
      errors.push({
        field: "scripts",
        message: `Script "${script.name}" is empty`,
        severity: "warning",
      });
    }
  }

  return errors;
}

/**
 * Check for hardcoded secrets in content
 */
export function checkForSecrets(content: string): ValidationError[] {
  const errors: ValidationError[] = [];

  const secretPatterns = [
    { pattern: /api[_-]?key\s*[=:]\s*["'][^"']{10,}["']/gi, name: "API key" },
    { pattern: /password\s*[=:]\s*["'][^"']+["']/gi, name: "password" },
    { pattern: /secret\s*[=:]\s*["'][^"']{10,}["']/gi, name: "secret" },
    { pattern: /token\s*[=:]\s*["'][^"']{20,}["']/gi, name: "token" },
    { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: "OpenAI API key" },
    { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: "GitHub token" },
    { pattern: /AKIA[0-9A-Z]{16}/g, name: "AWS access key" },
  ];

  for (const { pattern, name } of secretPatterns) {
    if (pattern.test(content)) {
      errors.push({
        field: "content",
        message: `Possible hardcoded ${name} detected. Remove secrets before deploying.`,
        severity: "error",
      });
    }
  }

  return errors;
}

/**
 * Validate a complete skill
 */
export function validateSkill(
  skillMd: string,
  scripts?: Array<{ name: string; content: string; language: string }>,
  references?: Array<{ name: string; content: string }>
): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Parse frontmatter
  const { frontmatter, body, error } = parseFrontmatter(skillMd);

  if (error) {
    allErrors.push({
      field: "frontmatter",
      message: error,
      severity: "error",
    });
  }

  if (frontmatter) {
    // Validate required fields
    allErrors.push(...validateName(frontmatter.name));
    allErrors.push(...validateDescription(frontmatter.description));
  }

  // Validate body length
  allErrors.push(...validateBodyLength(body));

  // Validate scripts
  allErrors.push(...validateScripts(scripts));

  // Check for secrets in all content
  allErrors.push(...checkForSecrets(skillMd));

  if (scripts) {
    for (const script of scripts) {
      const secretErrors = checkForSecrets(script.content);
      secretErrors.forEach((e) => {
        e.message = `In ${script.name}: ${e.message}`;
      });
      allErrors.push(...secretErrors);
    }
  }

  if (references) {
    for (const ref of references) {
      const secretErrors = checkForSecrets(ref.content);
      secretErrors.forEach((e) => {
        e.message = `In ${ref.name}: ${e.message}`;
      });
      allErrors.push(...secretErrors);
    }
  }

  return {
    valid: allErrors.filter((e) => e.severity === "error").length === 0,
    errors: allErrors.filter((e) => e.severity === "error"),
    warnings: allErrors.filter((e) => e.severity === "warning"),
  };
}

/**
 * Generate a valid skill name from a string
 */
export function generateSkillName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .replace(/-{2,}/g, "-") // Replace multiple hyphens with single
    .slice(0, 64); // Limit to 64 chars
}
