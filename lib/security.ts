/**
 * Security Scanning and Validation
 * Provides utilities for scanning generated code for security vulnerabilities
 */

export interface SecurityIssue {
  type: "vulnerability" | "credential" | "dangerous_code" | "insecure_dependency";
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  line?: number;
  code?: string;
  fix?: string;
}

export interface SecurityScanResult {
  passed: boolean;
  issues: SecurityIssue[];
  score: number; // 0-100, 100 being perfect
  scannedAt: number;
}

/**
 * Scan code for hardcoded credentials and secrets
 */
export function detectCredentialLeaks(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = code.split("\n");

  // Patterns to detect credentials
  const patterns = [
    {
      regex: /(?:api[_-]?key|apikey|access[_-]?key)\s*[=:]\s*["']([^"']+)["']/gi,
      type: "API Key",
    },
    {
      regex: /(?:secret|password|passwd|pwd)\s*[=:]\s*["']([^"']+)["']/gi,
      type: "Secret/Password",
    },
    {
      regex: /(?:token|auth[_-]?token)\s*[=:]\s*["']([^"']+)["']/gi,
      type: "Auth Token",
    },
    {
      regex: /(?:private[_-]?key|privatekey)\s*[=:]\s*["']([^"']+)["']/gi,
      type: "Private Key",
    },
    {
      regex: /(?:aws[_-]?access[_-]?key[_-]?id|awsKey)\s*[=:]\s*["']([A-Z0-9]{20})["']/gi,
      type: "AWS Access Key",
    },
    {
      regex: /(?:aws[_-]?secret[_-]?access[_-]?key)\s*[=:]\s*["']([A-Za-z0-9/+=]{40})["']/gi,
      type: "AWS Secret Key",
    },
    {
      regex: /Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*/g,
      type: "JWT Token",
    },
    {
      regex: /(?:ghToken|github[_-]?token)\s*[=:]\s*["'](ghp_[A-Za-z0-9_]{36,})["']/gi,
      type: "GitHub Token",
    },
  ];

  lines.forEach((line, index) => {
    // Skip environment variable usage (acceptable)
    if (line.includes("process.env.") || line.includes("import.meta.env.")) {
      return;
    }

    patterns.forEach(({ regex, type }) => {
      const matches = line.match(regex);
      if (matches) {
        issues.push({
          type: "credential",
          severity: "critical",
          message: `Hardcoded ${type} detected. Use environment variables instead.`,
          line: index + 1,
          code: line.trim(),
          fix: "Replace with process.env.YOUR_SECRET_NAME",
        });
      }
    });
  });

  return issues;
}

/**
 * Scan for dangerous code patterns
 */
export function detectDangerousCode(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const lines = code.split("\n");

  const dangerousPatterns = [
    {
      regex: /eval\s*\(/gi,
      message: "Use of eval() detected - this can lead to code injection vulnerabilities",
      severity: "critical" as const,
    },
    {
      regex: /Function\s*\(\s*["'][^"']*["']\s*\)/gi,
      message: "Dynamic function creation detected - potential code injection risk",
      severity: "high" as const,
    },
    {
      regex: /exec\s*\(|spawn\s*\(|execSync\s*\(/gi,
      message: "Command execution detected - ensure input is properly sanitized",
      severity: "high" as const,
    },
    {
      regex: /innerHTML\s*=/gi,
      message: "Direct innerHTML manipulation - potential XSS vulnerability",
      severity: "high" as const,
    },
    {
      regex: /dangerouslySetInnerHTML/gi,
      message: "dangerouslySetInnerHTML usage detected - ensure content is sanitized",
      severity: "medium" as const,
    },
    {
      regex: /document\.write\s*\(/gi,
      message: "document.write usage - can lead to XSS vulnerabilities",
      severity: "medium" as const,
    },
    {
      regex: /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*(?:\+|\$\{)/gi,
      message: "Possible SQL injection - use parameterized queries",
      severity: "critical" as const,
    },
    {
      regex: /\$\{[^}]*req\.(body|query|params)[^}]*\}/gi,
      message: "Template literal with user input - potential injection vulnerability",
      severity: "high" as const,
    },
  ];

  lines.forEach((line, index) => {
    dangerousPatterns.forEach(({ regex, message, severity }) => {
      if (regex.test(line)) {
        issues.push({
          type: "dangerous_code",
          severity,
          message,
          line: index + 1,
          code: line.trim(),
        });
      }
    });
  });

  return issues;
}

/**
 * Scan for insecure dependencies
 */
export function detectInsecureDependencies(packageJson: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  try {
    const pkg = JSON.parse(packageJson);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    // Known vulnerable packages (simplified - in production, use npm audit API)
    const vulnerablePackages = [
      { name: "lodash", versions: ["<4.17.21"], severity: "high" as const },
      { name: "axios", versions: ["<0.21.2"], severity: "medium" as const },
      { name: "express", versions: ["<4.17.3"], severity: "high" as const },
      { name: "minimist", versions: ["<1.2.6"], severity: "medium" as const },
    ];

    Object.entries(allDeps).forEach(([name, version]) => {
      const vulnerable = vulnerablePackages.find((vp) => vp.name === name);
      if (vulnerable) {
        issues.push({
          type: "insecure_dependency",
          severity: vulnerable.severity,
          message: `Package "${name}" at version ${version} has known vulnerabilities`,
          fix: `Update to latest version: npm install ${name}@latest`,
        });
      }
    });

    // Check for wildcard versions
    Object.entries(allDeps).forEach(([name, version]) => {
      if (typeof version === "string" && version.includes("*")) {
        issues.push({
          type: "insecure_dependency",
          severity: "medium",
          message: `Wildcard version for "${name}" can lead to unpredictable builds`,
          fix: `Pin to specific version`,
        });
      }
    });
  } catch (error) {
    // Invalid JSON
  }

  return issues;
}

/**
 * Check for missing security headers and configurations
 */
export function detectMissingSecurityConfigs(code: string): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for CORS configuration
  if (code.includes("cors") && !code.includes("origin:")) {
    issues.push({
      type: "vulnerability",
      severity: "medium",
      message: "CORS enabled without origin restriction - allows requests from any domain",
      fix: "Configure CORS with specific allowed origins",
    });
  }

  // Check for rate limiting
  if (
    (code.includes("app.post") || code.includes("app.get")) &&
    !code.includes("rateLimit") &&
    !code.includes("rate-limit")
  ) {
    issues.push({
      type: "vulnerability",
      severity: "low",
      message: "No rate limiting detected - API may be vulnerable to abuse",
      fix: "Implement rate limiting middleware",
    });
  }

  // Check for input validation
  if (
    (code.includes("req.body") || code.includes("req.query")) &&
    !code.includes("validate") &&
    !code.includes("schema")
  ) {
    issues.push({
      type: "vulnerability",
      severity: "medium",
      message: "User input without validation - potential injection vulnerabilities",
      fix: "Add input validation using a schema validator",
    });
  }

  // Check for HTTPS enforcement
  if (code.includes("http.createServer") && !code.includes("https")) {
    issues.push({
      type: "vulnerability",
      severity: "high",
      message: "HTTP server without HTTPS - data transmitted in plain text",
      fix: "Use HTTPS for production deployments",
    });
  }

  return issues;
}

/**
 * Comprehensive security scan
 */
export async function scanCode(params: {
  code: string;
  packageJson?: string;
}): Promise<SecurityScanResult> {
  const issues: SecurityIssue[] = [];

  // Run all security checks
  issues.push(...detectCredentialLeaks(params.code));
  issues.push(...detectDangerousCode(params.code));
  issues.push(...detectMissingSecurityConfigs(params.code));

  if (params.packageJson) {
    issues.push(...detectInsecureDependencies(params.packageJson));
  }

  // Calculate security score
  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;

  // Scoring: critical = -40, high = -20, medium = -10, low = -5
  const deduction =
    criticalCount * 40 + highCount * 20 + mediumCount * 10 + lowCount * 5;
  const score = Math.max(0, 100 - deduction);

  return {
    passed: criticalCount === 0 && highCount === 0,
    issues,
    score,
    scannedAt: Date.now(),
  };
}

/**
 * Sanitize code by removing detected issues
 */
export function sanitizeCode(code: string, issues: SecurityIssue[]): string {
  let sanitized = code;
  const lines = sanitized.split("\n");

  // Remove lines with critical issues
  const criticalLines = issues
    .filter((i) => i.severity === "critical" && i.line)
    .map((i) => i.line!);

  criticalLines.forEach((lineNum) => {
    if (lineNum <= lines.length) {
      lines[lineNum - 1] = `// REMOVED: Security issue detected at line ${lineNum}`;
    }
  });

  return lines.join("\n");
}

/**
 * Generate security audit log entry
 */
export interface SecurityAuditLog {
  id: string;
  serverId: string;
  userId: string;
  scanResult: SecurityScanResult;
  action: "scan" | "sanitize" | "reject" | "approve";
  timestamp: number;
  metadata?: Record<string, any>;
}

export function createAuditLog(params: {
  serverId: string;
  userId: string;
  scanResult: SecurityScanResult;
  action: "scan" | "sanitize" | "reject" | "approve";
  metadata?: Record<string, any>;
}): SecurityAuditLog {
  return {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    serverId: params.serverId,
    userId: params.userId,
    scanResult: params.scanResult,
    action: params.action,
    timestamp: Date.now(),
    metadata: params.metadata,
  };
}

/**
 * Sandbox configuration for generated code
 */
export interface SandboxConfig {
  allowedModules: string[];
  maxExecutionTime: number; // milliseconds
  maxMemory: number; // bytes
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowedDomains?: string[];
}

export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  allowedModules: [
    "elysia",
    "@modelcontextprotocol/sdk",
    "zod",
    "axios",
    "node-fetch",
  ],
  maxExecutionTime: 30000, // 30 seconds
  maxMemory: 512 * 1024 * 1024, // 512MB
  allowNetworkAccess: true,
  allowFileSystemAccess: false,
  allowedDomains: [],
};

/**
 * Validate code against sandbox configuration
 */
export function validateSandboxCompliance(
  code: string,
  config: SandboxConfig = DEFAULT_SANDBOX_CONFIG
): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for disallowed module imports
  const importRegex = /(?:import\s+.*?\s+from\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\))/g;
  let match;

  while ((match = importRegex.exec(code)) !== null) {
    const moduleName = (match[1] || match[2]).split("/")[0]; // Get base module name
    if (
      !config.allowedModules.includes(moduleName) &&
      !moduleName.startsWith(".") &&
      !moduleName.startsWith("/")
    ) {
      issues.push({
        type: "vulnerability",
        severity: "high",
        message: `Module "${moduleName}" is not allowed in sandbox environment`,
        code: match[0],
        fix: `Only use allowed modules: ${config.allowedModules.join(", ")}`,
      });
    }
  }

  // Check for file system access when not allowed
  if (!config.allowFileSystemAccess) {
    const fsPatterns = [/fs\.|require\(['"]fs['"]\)/g, /readFile|writeFile/g];

    fsPatterns.forEach((pattern) => {
      if (pattern.test(code)) {
        issues.push({
          type: "vulnerability",
          severity: "high",
          message: "File system access is not allowed in sandbox environment",
          fix: "Remove file system operations",
        });
      }
    });
  }

  return issues;
}
