/**
 * Tests for Security Scanning Module
 */

import { describe, it, expect } from "vitest";
import {
  detectCredentialLeaks,
  detectDangerousCode,
  detectInsecureDependencies,
  detectMissingSecurityConfigs,
  scanCode,
  sanitizeCode,
  createAuditLog,
  validateSandboxCompliance,
  DEFAULT_SANDBOX_CONFIG,
} from "./security";

describe("Security Scanning", () => {
  describe("Credential Leak Detection", () => {
    it("should detect hardcoded API keys", () => {
      const code = `const apiKey = "sk_test_123456789";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe("credential");
      expect(issues[0].severity).toBe("critical");
    });

    it("should detect hardcoded passwords", () => {
      const code = `const password = "mySecretPassword123";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain("Secret/Password");
    });

    it("should detect hardcoded tokens", () => {
      const code = `const token = "bearer_token_abc123";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should detect AWS access keys", () => {
      const code = `const awsKey = "AKIAIOSFODNN7EXAMPLE";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain("AWS Access Key");
    });

    it("should detect AWS secret keys", () => {
      const code = `const awsSecret = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should detect GitHub tokens", () => {
      const code = `const ghToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toMatch(/GitHub Token|Auth Token/);
    });

    it("should NOT flag environment variables", () => {
      const code = `const apiKey = process.env.API_KEY;`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBe(0);
    });

    it("should NOT flag import.meta.env usage", () => {
      const code = `const secret = import.meta.env.VITE_API_KEY;`;
      const issues = detectCredentialLeaks(code);

      expect(issues.length).toBe(0);
    });

    it("should provide line numbers for issues", () => {
      const code = `const x = 1;\nconst apiKey = "test123";\nconst y = 2;`;
      const issues = detectCredentialLeaks(code);

      expect(issues[0].line).toBe(2);
    });

    it("should provide fix suggestions", () => {
      const code = `const secret = "hardcoded";`;
      const issues = detectCredentialLeaks(code);

      expect(issues[0].fix).toContain("process.env");
    });
  });

  describe("Dangerous Code Detection", () => {
    it("should detect eval usage", () => {
      const code = `eval("malicious code");`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe("critical");
      expect(issues[0].message).toContain("eval");
    });

    it("should detect dynamic function creation", () => {
      const code = `const fn = Function("return 2 + 2");`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe("high");
    });

    it("should detect command execution", () => {
      const code = `exec("rm -rf /");`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain("Command execution");
    });

    it("should detect innerHTML manipulation", () => {
      const code = `element.innerHTML = userInput;`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain("XSS");
    });

    it("should detect dangerouslySetInnerHTML", () => {
      const code = `<div dangerouslySetInnerHTML={{__html: data}} />`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should detect document.write", () => {
      const code = `document.write("<script>alert('xss')</script>");`;
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should detect potential SQL injection", () => {
      const code = "SELECT * FROM users WHERE id = ${userId}";
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].severity).toBe("critical");
    });

    it("should detect template literal injection", () => {
      const code = "const query = `SELECT * FROM users WHERE name = ${req.body.name}`;";
      const issues = detectDangerousCode(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should provide code snippets for issues", () => {
      const code = `eval("test");`;
      const issues = detectDangerousCode(code);

      expect(issues[0].code).toContain("eval");
    });
  });

  describe("Insecure Dependencies Detection", () => {
    it("should detect vulnerable package versions", () => {
      const packageJson = JSON.stringify({
        dependencies: {
          lodash: "4.17.0",
        },
      });

      const issues = detectInsecureDependencies(packageJson);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].type).toBe("insecure_dependency");
    });

    it("should detect wildcard versions", () => {
      const packageJson = JSON.stringify({
        dependencies: {
          express: "*",
        },
      });

      const issues = detectInsecureDependencies(packageJson);

      expect(issues.some((i) => i.message.includes("Wildcard"))).toBe(true);
    });

    it("should check both dependencies and devDependencies", () => {
      const packageJson = JSON.stringify({
        dependencies: {
          axios: "0.20.0",
        },
        devDependencies: {
          lodash: "4.17.0",
        },
      });

      const issues = detectInsecureDependencies(packageJson);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should provide update suggestions", () => {
      const packageJson = JSON.stringify({
        dependencies: {
          minimist: "1.0.0",
        },
      });

      const issues = detectInsecureDependencies(packageJson);

      expect(issues[0].fix).toContain("npm install");
    });

    it("should handle invalid JSON gracefully", () => {
      const packageJson = "invalid json";
      const issues = detectInsecureDependencies(packageJson);

      expect(issues).toBeDefined();
    });
  });

  describe("Missing Security Configs Detection", () => {
    it("should detect unrestricted CORS", () => {
      const code = `app.use(cors());`;
      const issues = detectMissingSecurityConfigs(code);

      expect(issues.some((i) => i.message.includes("CORS"))).toBe(true);
    });

    it("should detect missing rate limiting", () => {
      const code = `app.post("/api/endpoint", handler);`;
      const issues = detectMissingSecurityConfigs(code);

      expect(issues.some((i) => i.message.includes("rate limiting"))).toBe(true);
    });

    it("should detect missing input validation", () => {
      const code = `const data = req.body;`;
      const issues = detectMissingSecurityConfigs(code);

      expect(issues.some((i) => i.message.includes("validation"))).toBe(true);
    });

    it("should detect HTTP without HTTPS", () => {
      const code = `http.createServer(app);`;
      const issues = detectMissingSecurityConfigs(code);

      expect(issues.some((i) => i.message.includes("HTTPS"))).toBe(true);
      expect(issues.find((i) => i.message.includes("HTTPS"))?.severity).toBe("high");
    });

    it("should NOT flag validated input", () => {
      const code = `const validated = schema.validate(req.body);`;
      const issues = detectMissingSecurityConfigs(code);

      expect(issues.some((i) => i.message.includes("validation"))).toBe(false);
    });
  });

  describe("Comprehensive Code Scan", () => {
    it("should scan code for all security issues", async () => {
      const code = `
        const apiKey = "hardcoded_key";
        eval("dangerous");
        app.post("/test", (req, res) => {
          const data = req.body;
        });
      `;

      const result = await scanCode({ code });

      expect(result).toBeDefined();
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.scannedAt).toBeGreaterThan(0);
    });

    it("should include package.json scan when provided", async () => {
      const code = `const app = require("express")();`;
      const packageJson = JSON.stringify({
        dependencies: {
          express: "*",
        },
      });

      const result = await scanCode({ code, packageJson });

      expect(result.issues.some((i) => i.type === "insecure_dependency")).toBe(true);
    });

    it("should calculate security score", async () => {
      const code = `const safe = process.env.API_KEY;`;
      const result = await scanCode({ code });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should pass clean code", async () => {
      const code = `
        const apiKey = process.env.API_KEY;
        export function handler(req, res) {
          const validated = schema.validate(req.body);
          return res.json({ ok: true });
        }
      `;

      const result = await scanCode({ code });

      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it("should fail code with critical issues", async () => {
      const code = `
        const apiKey = "hardcoded123";
        eval("malicious");
      `;

      const result = await scanCode({ code });

      expect(result.passed).toBe(false);
    });

    it("should penalize critical issues more than low issues", async () => {
      const criticalCode = `eval("bad");`;
      const lowCode = `app.post("/test", handler);`;

      const criticalResult = await scanCode({ code: criticalCode });
      const lowResult = await scanCode({ code: lowCode });

      expect(criticalResult.score).toBeLessThan(lowResult.score);
    });
  });

  describe("Code Sanitization", () => {
    it("should remove lines with critical issues", () => {
      const code = `const x = 1;\nconst key = "secret";\nconst y = 2;`;
      const issues = [
        {
          type: "credential" as const,
          severity: "critical" as const,
          message: "Hardcoded secret",
          line: 2,
        },
      ];

      const sanitized = sanitizeCode(code, issues);

      expect(sanitized).toContain("REMOVED");
      expect(sanitized).toContain("const x = 1;");
      expect(sanitized).toContain("const y = 2;");
    });

    it("should handle multiple critical issues", () => {
      const code = `line1\nline2\nline3\nline4`;
      const issues = [
        {
          type: "credential" as const,
          severity: "critical" as const,
          message: "Issue 1",
          line: 1,
        },
        {
          type: "credential" as const,
          severity: "critical" as const,
          message: "Issue 2",
          line: 3,
        },
      ];

      const sanitized = sanitizeCode(code, issues);
      const removedCount = (sanitized.match(/REMOVED/g) || []).length;

      expect(removedCount).toBe(2);
    });

    it("should not remove non-critical issues", () => {
      const code = `const x = 1;`;
      const issues = [
        {
          type: "vulnerability" as const,
          severity: "low" as const,
          message: "Low issue",
          line: 1,
        },
      ];

      const sanitized = sanitizeCode(code, issues);

      expect(sanitized).not.toContain("REMOVED");
    });
  });

  describe("Security Audit Logs", () => {
    it("should create audit log entry", () => {
      const scanResult = {
        passed: true,
        issues: [],
        score: 100,
        scannedAt: Date.now(),
      };

      const log = createAuditLog({
        serverId: "server_123",
        userId: "user_456",
        scanResult,
        action: "scan",
      });

      expect(log.id).toContain("audit_");
      expect(log.serverId).toBe("server_123");
      expect(log.userId).toBe("user_456");
      expect(log.action).toBe("scan");
      expect(log.timestamp).toBeGreaterThan(0);
    });

    it("should include scan result in log", () => {
      const scanResult = {
        passed: false,
        issues: [
          {
            type: "credential" as const,
            severity: "critical" as const,
            message: "Test",
          },
        ],
        score: 50,
        scannedAt: Date.now(),
      };

      const log = createAuditLog({
        serverId: "server_123",
        userId: "user_456",
        scanResult,
        action: "reject",
      });

      expect(log.scanResult.passed).toBe(false);
      expect(log.scanResult.score).toBe(50);
    });

    it("should support different action types", () => {
      const scanResult = {
        passed: true,
        issues: [],
        score: 100,
        scannedAt: Date.now(),
      };

      const actions: Array<"scan" | "sanitize" | "reject" | "approve"> = [
        "scan",
        "sanitize",
        "reject",
        "approve",
      ];

      actions.forEach((action) => {
        const log = createAuditLog({
          serverId: "server_123",
          userId: "user_456",
          scanResult,
          action,
        });

        expect(log.action).toBe(action);
      });
    });

    it("should include optional metadata", () => {
      const scanResult = {
        passed: true,
        issues: [],
        score: 100,
        scannedAt: Date.now(),
      };

      const log = createAuditLog({
        serverId: "server_123",
        userId: "user_456",
        scanResult,
        action: "scan",
        metadata: {
          reason: "Automated scan",
          triggeredBy: "deployment",
        },
      });

      expect(log.metadata?.reason).toBe("Automated scan");
      expect(log.metadata?.triggeredBy).toBe("deployment");
    });

    it("should generate unique IDs", () => {
      const scanResult = {
        passed: true,
        issues: [],
        score: 100,
        scannedAt: Date.now(),
      };

      const log1 = createAuditLog({
        serverId: "server_123",
        userId: "user_456",
        scanResult,
        action: "scan",
      });

      const log2 = createAuditLog({
        serverId: "server_123",
        userId: "user_456",
        scanResult,
        action: "scan",
      });

      expect(log1.id).not.toBe(log2.id);
    });
  });

  describe("Sandbox Validation", () => {
    it("should detect disallowed module imports", () => {
      const code = `import fs from "fs";`;
      const issues = validateSandboxCompliance(code);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].message).toContain("not allowed");
    });

    it("should allow approved modules", () => {
      const code = `import { Elysia } from "elysia";`;
      const issues = validateSandboxCompliance(code);

      expect(issues.length).toBe(0);
    });

    it("should allow relative imports", () => {
      const code = `import util from "./utils";`;
      const issues = validateSandboxCompliance(code);

      expect(issues.length).toBe(0);
    });

    it("should detect file system access when disabled", () => {
      const code = `import fs from "fs";\nfs.readFile("test.txt");`;
      const config = { ...DEFAULT_SANDBOX_CONFIG, allowFileSystemAccess: false };
      const issues = validateSandboxCompliance(code, config);

      expect(issues.some((i) => i.message.includes("File system"))).toBe(true);
    });

    it("should support custom sandbox config", () => {
      const code = `import custom from "custom-module";`;
      const config = {
        ...DEFAULT_SANDBOX_CONFIG,
        allowedModules: [...DEFAULT_SANDBOX_CONFIG.allowedModules, "custom-module"],
      };

      const issues = validateSandboxCompliance(code, config);

      expect(issues.length).toBe(0);
    });

    it("should detect require statements", () => {
      const code = `const fs = require("fs");`;
      const issues = validateSandboxCompliance(code);

      expect(issues.length).toBeGreaterThan(0);
    });

    it("should provide fix suggestions for disallowed modules", () => {
      const code = `import child_process from "child_process";`;
      const issues = validateSandboxCompliance(code);

      expect(issues[0].fix).toContain("allowed modules");
    });
  });

  describe("Security Severity Levels", () => {
    it("should classify hardcoded credentials as critical", () => {
      const code = `const secret = "password123";`;
      const issues = detectCredentialLeaks(code);

      expect(issues[0].severity).toBe("critical");
    });

    it("should classify eval as critical", () => {
      const code = `eval("test");`;
      const issues = detectDangerousCode(code);

      expect(issues[0].severity).toBe("critical");
    });

    it("should classify command execution as high", () => {
      const code = `exec("ls");`;
      const issues = detectDangerousCode(code);

      expect(issues[0].severity).toBe("high");
    });

    it("should classify missing rate limiting as low", () => {
      const code = `app.post("/test", handler);`;
      const issues = detectMissingSecurityConfigs(code);

      const rateLimitIssue = issues.find((i) => i.message.includes("rate limiting"));
      expect(rateLimitIssue?.severity).toBe("low");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty code", async () => {
      const result = await scanCode({ code: "" });

      expect(result.passed).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it("should handle code with only comments", async () => {
      const code = `// Just a comment\n/* Another comment */`;
      const result = await scanCode({ code });

      expect(result.passed).toBe(true);
    });

    it("should handle multiline strings", () => {
      const code = `
        const query = \`
          SELECT * FROM users
          WHERE id = 1
        \`;
      `;
      const issues = detectDangerousCode(code);

      expect(issues).toBeDefined();
    });

    it("should handle code without line breaks", async () => {
      const code = `const x = 1; const y = 2;`;
      const result = await scanCode({ code });

      expect(result).toBeDefined();
    });
  });
});
