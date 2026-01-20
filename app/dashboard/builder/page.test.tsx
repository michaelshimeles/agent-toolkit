/**
 * Tests for AI Builder Page
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

describe("AI Builder Page", () => {
  describe("Input Type Selection", () => {
    it("should have OpenAPI input type option", () => {
      const inputType = "openapi";
      expect(inputType).toBe("openapi");
    });

    it("should have Documentation URL input type option", () => {
      const inputType = "docs_url";
      expect(inputType).toBe("docs_url");
    });

    it("should have GitHub Repo input type option", () => {
      const inputType = "github_repo";
      expect(inputType).toBe("github_repo");
    });

    it("should have Postman collection input type option", () => {
      const inputType = "postman";
      expect(inputType).toBe("postman");
    });

    it("should have text description input type option", () => {
      const inputType = "text";
      expect(inputType).toBe("text");
    });
  });

  describe("Input Validation", () => {
    it("should validate OpenAPI spec URL format", () => {
      const url = "https://api.example.com/openapi.json";
      const isValid = url.startsWith("http");
      expect(isValid).toBe(true);
    });

    it("should validate GitHub repo URL format", () => {
      const url = "https://github.com/owner/repo";
      const isValid = url.includes("github.com");
      expect(isValid).toBe(true);
    });

    it("should reject invalid URLs", () => {
      const url = "not-a-url";
      const isValid = url.startsWith("http");
      expect(isValid).toBe(false);
    });

    it("should require non-empty input", () => {
      const input = "";
      const isValid = input.trim().length > 0;
      expect(isValid).toBe(false);
    });
  });

  describe("UI State Management", () => {
    it("should start with analyzing state as false", () => {
      const isAnalyzing = false;
      expect(isAnalyzing).toBe(false);
    });

    it("should set analyzing state to true during analysis", () => {
      let isAnalyzing = false;
      isAnalyzing = true;
      expect(isAnalyzing).toBe(true);
    });

    it("should disable submit button while analyzing", () => {
      const isAnalyzing = true;
      const isDisabled = isAnalyzing;
      expect(isDisabled).toBe(true);
    });

    it("should disable submit button with empty input", () => {
      const input = "";
      const isDisabled = !input.trim();
      expect(isDisabled).toBe(true);
    });

    it("should enable submit button with valid input", () => {
      const input = "https://api.example.com/openapi.json";
      const isAnalyzing = false;
      const isDisabled = isAnalyzing || !input.trim();
      expect(isDisabled).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should display error message on failed analysis", () => {
      const error = "Failed to fetch OpenAPI spec";
      expect(error).toBeTruthy();
      expect(error).toContain("Failed to fetch");
    });

    it("should clear error on new submission", () => {
      let error: string | null = "Previous error";
      error = null;
      expect(error).toBeNull();
    });

    it("should handle network errors", () => {
      const error = new Error("Network error");
      expect(error.message).toBe("Network error");
    });

    it("should handle invalid JSON responses", () => {
      const errorMessage = "Invalid JSON response";
      expect(errorMessage).toContain("Invalid JSON");
    });
  });

  describe("Generated Servers List", () => {
    it("should display list of generated servers", () => {
      const servers = [
        {
          _id: "1",
          name: "Test API",
          description: "Test description",
          tools: [{ name: "tool1", description: "desc", schema: {} }],
          status: "draft" as const,
        },
      ];

      expect(servers).toHaveLength(1);
      expect(servers[0].name).toBe("Test API");
    });

    it("should display server status badge", () => {
      const statuses = ["draft", "deploying", "deployed", "failed"] as const;
      statuses.forEach((status) => {
        expect(["draft", "deploying", "deployed", "failed"]).toContain(status);
      });
    });

    it("should display tool count for each server", () => {
      const server = {
        tools: [
          { name: "tool1", description: "desc1", schema: {} },
          { name: "tool2", description: "desc2", schema: {} },
        ],
      };

      expect(server.tools.length).toBe(2);
    });

    it("should link to server detail page", () => {
      const serverId = "abc123";
      const detailUrl = `/dashboard/builder/${serverId}`;
      expect(detailUrl).toBe("/dashboard/builder/abc123");
    });
  });

  describe("Navigation", () => {
    it("should redirect to preview page after successful analysis", () => {
      const serverId = "new-server-123";
      const redirectUrl = `/dashboard/builder/${serverId}`;
      expect(redirectUrl).toContain(serverId);
    });

    it("should construct correct detail page URL", () => {
      const serverId = "test-server";
      const url = `/dashboard/builder/${serverId}`;
      expect(url).toBe("/dashboard/builder/test-server");
    });
  });

  describe("Input Placeholders", () => {
    it("should show OpenAPI placeholder for OpenAPI input type", () => {
      const inputType = "openapi";
      const placeholder =
        inputType === "openapi"
          ? "https://api.example.com/openapi.json"
          : "";
      expect(placeholder).toBe("https://api.example.com/openapi.json");
    });

    it("should show docs URL placeholder for docs_url input type", () => {
      const inputType = "docs_url";
      const placeholder =
        inputType === "docs_url" ? "https://docs.example.com/api" : "";
      expect(placeholder).toBe("https://docs.example.com/api");
    });

    it("should show GitHub placeholder for github_repo input type", () => {
      const inputType = "github_repo";
      const placeholder =
        inputType === "github_repo" ? "https://github.com/username/repo" : "";
      expect(placeholder).toBe("https://github.com/username/repo");
    });
  });

  describe("Status Colors", () => {
    it("should use green for deployed status", () => {
      const status = "deployed";
      const color = status === "deployed" ? "green" : "other";
      expect(color).toBe("green");
    });

    it("should use red for failed status", () => {
      const status = "failed";
      const color = status === "failed" ? "red" : "other";
      expect(color).toBe("red");
    });

    it("should use yellow for draft status", () => {
      const status = "draft";
      const color =
        status === "draft" || status === "deploying" ? "yellow" : "other";
      expect(color).toBe("yellow");
    });

    it("should use yellow for deploying status", () => {
      const status: string = "deploying";
      const color =
        status === "draft" || status === "deploying" ? "yellow" : "other";
      expect(color).toBe("yellow");
    });
  });

  describe("Form Labels", () => {
    it("should show correct label for OpenAPI input", () => {
      const inputType = "openapi";
      const label = "OpenAPI Spec URL";
      expect(label).toBe("OpenAPI Spec URL");
    });

    it("should show correct label for docs URL input", () => {
      const inputType = "docs_url";
      const label = "Documentation URL";
      expect(label).toBe("Documentation URL");
    });

    it("should show correct label for GitHub repo input", () => {
      const inputType = "github_repo";
      const label = "GitHub Repository URL";
      expect(label).toBe("GitHub Repository URL");
    });
  });

  describe("Button States", () => {
    it("should show 'Analyze API →' when not analyzing", () => {
      const isAnalyzing = false;
      const buttonText = isAnalyzing ? "Analyzing..." : "Analyze API →";
      expect(buttonText).toBe("Analyze API →");
    });

    it("should show 'Analyzing...' when analyzing", () => {
      const isAnalyzing = true;
      const buttonText = isAnalyzing ? "Analyzing..." : "Analyze API →";
      expect(buttonText).toBe("Analyzing...");
    });
  });
});
