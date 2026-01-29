/**
 * Template Matcher
 * Matches user descriptions to skill templates based on keyword analysis
 */

import { SKILL_TEMPLATES, SkillTemplate } from "./skills/templates";

/**
 * Represents a match between a user description and a skill template
 */
export interface TemplateMatch {
  templateId: string;
  templateName: string;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Keywords associated with each template ID for matching purposes
 */
export const TEMPLATE_KEYWORDS: Record<string, string[]> = {
  "code-review": ["review", "pr", "pull request", "code quality", "feedback"],
  "documentation": ["docs", "documentation", "readme", "comments", "jsdoc"],
  "testing": ["test", "unit test", "integration", "coverage", "jest", "pytest"],
  "git-workflow": ["git", "commit", "branch", "merge", "rebase"],
  "api-integration": ["api", "rest", "graphql", "endpoint", "fetch"],
  "data-analysis": ["data", "analysis", "csv", "json", "transform"],
  "security-audit": ["security", "vulnerability", "audit", "owasp"],
  "refactoring": ["refactor", "clean code", "optimize", "simplify"],
};

/**
 * Tokenizes and normalizes a description string for matching
 * @param description - The user's description text
 * @returns Array of normalized tokens
 */
function tokenizeDescription(description: string): string[] {
  return description
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ") // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter((token) => token.length > 1); // Remove single characters
}

/**
 * Checks if a keyword matches within the description
 * Handles multi-word keywords by checking for substring presence
 * @param tokens - Tokenized description
 * @param normalizedDescription - Full lowercase description
 * @param keyword - Keyword to match
 * @returns True if keyword matches
 */
function keywordMatches(
  tokens: string[],
  normalizedDescription: string,
  keyword: string
): boolean {
  const normalizedKeyword = keyword.toLowerCase();

  // For multi-word keywords, check substring presence
  if (normalizedKeyword.includes(" ")) {
    return normalizedDescription.includes(normalizedKeyword);
  }

  // For single-word keywords, check token match or partial match
  return tokens.some(
    (token) =>
      token === normalizedKeyword ||
      token.includes(normalizedKeyword) ||
      normalizedKeyword.includes(token)
  );
}

/**
 * Calculates a confidence score for a template based on keyword matches
 * @param matchedKeywords - Array of matched keywords
 * @param totalKeywords - Total keywords for the template
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(
  matchedKeywords: string[],
  totalKeywords: number
): number {
  if (totalKeywords === 0) return 0;

  // Base score from keyword match ratio
  const matchRatio = matchedKeywords.length / totalKeywords;

  // Boost score if multiple keywords matched (indicates stronger relevance)
  const multiMatchBonus = Math.min(matchedKeywords.length * 0.1, 0.3);

  // Final confidence capped at 1.0
  return Math.min(matchRatio + multiMatchBonus, 1.0);
}

/**
 * Matches a user description to skill templates based on keyword analysis
 * @param description - The user's description of the skill they want
 * @returns Array of up to 3 template matches sorted by confidence (descending),
 *          only including matches with confidence > 0.3
 */
export function matchSkillToTemplates(description: string): TemplateMatch[] {
  if (!description || description.trim().length === 0) {
    return [];
  }

  const normalizedDescription = description.toLowerCase();
  const tokens = tokenizeDescription(description);
  const matches: TemplateMatch[] = [];

  // Score each template based on keyword matches
  for (const [templateId, keywords] of Object.entries(TEMPLATE_KEYWORDS)) {
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (keywordMatches(tokens, normalizedDescription, keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      const template = SKILL_TEMPLATES.find((t) => t.id === templateId);
      const confidence = calculateConfidence(matchedKeywords, keywords.length);

      if (template && confidence > 0.3) {
        matches.push({
          templateId,
          templateName: template.name,
          confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
          matchedKeywords,
        });
      }
    }
  }

  // Sort by confidence descending and return top 3
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Gets a template by its ID
 * @param templateId - The template ID to look up
 * @returns The template if found, undefined otherwise
 */
export function getTemplateById(templateId: string): SkillTemplate | undefined {
  return SKILL_TEMPLATES.find((t) => t.id === templateId);
}
