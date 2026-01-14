"use node";

/**
 * AI Builder Actions - Convex Actions for generating MCP servers
 * These actions use Node.js APIs and must be in a separate file with "use node"
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import {
  generateMCPFromOpenAPI,
  generateMCPFromDocs,
  analyzeGitHubRepo as analyzeRepo,
  generateDocumentation as generateDocs,
} from "../lib/claude";
import {
  deployMCPServer,
  checkMCPServerHealth,
} from "../lib/vercel";

// ============================================================================
// Utility Functions
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const GITHUB_TIMEOUT_MS = 15000;

/**
 * Fetch with timeout - wraps fetch with AbortSignal timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate URL-safe slug from name
 */
function generateSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    return `server-${Date.now()}`;
  }

  return slug;
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get GitHub API headers with optional authentication
 */
function getGitHubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "MCP-Hub-Builder",
  };

  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers["Authorization"] = `Bearer ${githubToken}`;
  }

  return headers;
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseOpenAPIEndpoints(spec: any): any[] {
  const endpoints = [];

  for (const [path, methods] of Object.entries(spec.paths || {})) {
    for (const [method, details] of Object.entries(methods as any)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        endpoints.push({
          path,
          method: method.toUpperCase(),
          operationId: (details as any).operationId,
          summary: (details as any).summary,
          description: (details as any).description,
          parameters: (details as any).parameters || [],
          requestBody: (details as any).requestBody,
          responses: (details as any).responses,
        });
      }
    }
  }

  return endpoints;
}

function extractOpenAPISchemas(spec: any): any {
  return spec.components?.schemas || {};
}

async function generateMCPCode(params: {
  name: string;
  description: string;
  endpoints: any[];
  schemas: any;
  sourceType: string;
  baseUrl?: string | null;
}): Promise<{ code: string; tools: any[] }> {
  // Use real Claude API to generate MCP server code
  const spec = {
    info: {
      title: params.name,
      description: params.description,
    },
    servers: params.baseUrl ? [{ url: params.baseUrl }] : [],
    paths: {},
    components: {
      schemas: params.schemas,
    },
  };

  // Convert endpoints to OpenAPI paths format
  for (const endpoint of params.endpoints) {
    const path = endpoint.path || "/";
    if (!(spec.paths as any)[path]) {
      (spec.paths as any)[path] = {};
    }
    const method = (endpoint.method || "get").toLowerCase();
    (spec.paths as any)[path][method] = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
    };
  }

  const result = await generateMCPFromOpenAPI(spec);
  return {
    code: result.code,
    tools: result.tools || [],
  };
}

async function analyzeAPIDocumentation(
  html: string,
  url: string
): Promise<{
  name: string;
  description: string;
  endpoints: any[];
  schemas: any;
  code: string;
  tools: any[];
}> {
  // Use real Claude API to analyze documentation
  try {
    const result = await generateMCPFromDocs(html, url);
    return {
      name: result.name || "Unknown API",
      description: result.description || "Generated from documentation",
      endpoints: result.endpoints || [],
      schemas: {},
      code: result.code || "",
      tools: result.tools || [],
    };
  } catch (error) {
    console.error("Failed to analyze API documentation:", error);
    throw new Error(
      `Failed to analyze API documentation from ${url}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function analyzeGitHubRepo(
  owner: string,
  repo: string
): Promise<{
  endpoints: any[];
  schemas: any;
  baseUrl: string | null;
}> {
  // Supported file extensions for code analysis
  const codeExtensions = [
    ".ts", ".js", ".tsx", ".jsx", // JavaScript/TypeScript
    ".go",                        // Go
    ".py",                        // Python
    ".rs",                        // Rust
    ".java",                      // Java
    ".rb",                        // Ruby
    ".php",                       // PHP
  ];

  // API-related file patterns (higher priority)
  const apiPatterns = [
    "openapi", "swagger", "api", "route", "controller",
    "handler", "endpoint", "server", "rest", "http"
  ];

  // Config files that might contain API info
  const configFiles = [
    "openapi.yaml", "openapi.yml", "openapi.json",
    "swagger.yaml", "swagger.yml", "swagger.json",
    "api.yaml", "api.yml", "api.json"
  ];

  const relevantFiles: Array<{ path: string; content: string }> = [];
  const maxFiles = 15;
  const maxContentSize = 8000;
  const maxTotalSize = 50000;
  let totalSize = 0;

  // Helper to check if file is relevant
  const isRelevantFile = (path: string): boolean => {
    const lowerPath = path.toLowerCase();
    return codeExtensions.some(ext => lowerPath.endsWith(ext)) ||
           configFiles.some(cf => lowerPath.endsWith(cf));
  };

  // Helper to score file relevance (higher = more relevant for API analysis)
  const scoreFile = (path: string): number => {
    const lowerPath = path.toLowerCase();
    let score = 0;

    // Boost for API-related patterns in path
    for (const pattern of apiPatterns) {
      if (lowerPath.includes(pattern)) score += 10;
    }

    // Boost for config files
    for (const cf of configFiles) {
      if (lowerPath.endsWith(cf)) score += 50;
    }

    // Penalize test files
    if (lowerPath.includes("test") || lowerPath.includes("spec")) score -= 5;

    // Penalize vendor/deps
    if (lowerPath.includes("vendor") || lowerPath.includes("node_modules")) score -= 100;

    return score;
  };

  // Recursive function to explore directories
  async function exploreDirectory(path: string, depth: number = 0): Promise<Array<{ path: string; download_url: string; score: number }>> {
    if (depth > 3) return []; // Limit depth to avoid too deep recursion

    const apiUrl = path
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
      : `https://api.github.com/repos/${owner}/${repo}/contents`;

    const response = await fetchWithTimeout(
      apiUrl,
      { headers: getGitHubHeaders() },
      GITHUB_TIMEOUT_MS
    );

    if (!response.ok) {
      if (response.status === 403) {
        console.warn(`GitHub API rate limit hit while fetching ${path || "root"}`);
      } else {
        console.warn(`Failed to fetch ${apiUrl}: ${response.status}`);
      }
      return [];
    }

    const items = await response.json();
    if (!Array.isArray(items)) return [];

    const foundFiles: Array<{ path: string; download_url: string; score: number }> = [];

    // Priority directories to explore
    const priorityDirs = ["api", "pkg", "internal", "src", "cmd", "server", "routes", "handlers", "controllers"];

    // Sort items: priority directories first, then by name
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === "dir" && b.type === "dir") {
        const aIsPriority = priorityDirs.some(d => a.name.toLowerCase().includes(d));
        const bIsPriority = priorityDirs.some(d => b.name.toLowerCase().includes(d));
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
      }
      return 0;
    });

    for (const item of sortedItems) {
      // Skip vendor, node_modules, and hidden directories
      if (item.name.startsWith(".") ||
          item.name === "vendor" ||
          item.name === "node_modules" ||
          item.name === "__pycache__") {
        continue;
      }

      if (item.type === "file" && isRelevantFile(item.path)) {
        foundFiles.push({
          path: item.path,
          download_url: item.download_url,
          score: scoreFile(item.path)
        });
      } else if (item.type === "dir" && depth < 3) {
        // Explore subdirectories (with depth limit)
        const subFiles = await exploreDirectory(item.path, depth + 1);
        foundFiles.push(...subFiles);
      }

      // Stop if we have enough high-scoring files
      if (foundFiles.filter(f => f.score > 0).length >= maxFiles * 2) {
        break;
      }
    }

    return foundFiles;
  }

  // Explore the repository
  const allFiles = await exploreDirectory("");

  // Sort by score and take top files
  allFiles.sort((a, b) => b.score - a.score);
  const topFiles = allFiles.slice(0, maxFiles);

  if (topFiles.length === 0) {
    throw new Error(
      `No relevant code files found in repository ${owner}/${repo}. ` +
      `Supported file types: ${codeExtensions.join(", ")}. ` +
      `Make sure the repository contains source code files.`
    );
  }

  // Download file contents with failure tracking
  let downloadFailures = 0;
  for (const file of topFiles) {
    if (totalSize >= maxTotalSize) {
      console.log(`Reached max content size (${maxTotalSize} bytes), stopping downloads`);
      break;
    }

    try {
      const contentResponse = await fetchWithTimeout(
        file.download_url,
        { headers: getGitHubHeaders() },
        GITHUB_TIMEOUT_MS
      );

      if (contentResponse.ok) {
        const content = await contentResponse.text();
        const truncatedContent = content.slice(0, maxContentSize);
        if (truncatedContent.length < content.length) {
          console.log(`File ${file.path} truncated from ${content.length} to ${maxContentSize} bytes`);
        }
        relevantFiles.push({
          path: file.path,
          content: truncatedContent,
        });
        totalSize += truncatedContent.length;
      } else {
        downloadFailures++;
        console.warn(`Failed to download ${file.path}: ${contentResponse.status}`);
      }
    } catch (err) {
      downloadFailures++;
      console.warn(`Failed to download ${file.path}:`, err instanceof Error ? err.message : err);
    }
  }

  // Check if too many downloads failed
  const successRate = relevantFiles.length / topFiles.length;
  if (relevantFiles.length === 0) {
    throw new Error(
      `Failed to download any code files from repository ${owner}/${repo}. ` +
      `${downloadFailures} files failed. Please check if the repository is accessible.`
    );
  } else if (successRate < 0.5) {
    console.warn(
      `Only ${relevantFiles.length}/${topFiles.length} files downloaded successfully. ` +
      `Analysis may be incomplete.`
    );
  }

  console.log(
    `Analyzing ${relevantFiles.length} files from ${owner}/${repo}:`,
    relevantFiles.map(f => f.path)
  );

  // Use Claude to analyze the code
  const result = await analyzeRepo(relevantFiles);

  return {
    endpoints: result.endpoints || [],
    schemas: {},
    baseUrl: result.baseUrl || null,
  };
}

async function deployToVercel(ctx: any, server: any): Promise<string> {
  // Get stored API keys for this server if it requires external API keys
  let envVars: Record<string, string> = {};

  if (server.requiresExternalApiKey && server.externalApiService) {
    // Get the decrypted API key for this service
    const decryptedKey = await ctx.runAction(api.builderActions.getDecryptedApiKey, {
      userId: server.userId,
      serviceName: server.externalApiService,
    });

    if (decryptedKey) {
      // Store API keys as JSON string for deployment
      envVars.STORED_API_KEYS = JSON.stringify({
        [server.externalApiService]: decryptedKey,
      });
    }
  }

  // Use real Vercel API to deploy
  const result = await deployMCPServer({
    serverName: server.slug,
    serverCode: server.code,
    env: envVars,
  });

  // Check health
  const health = await checkMCPServerHealth(result.url);
  if (!health.ok) {
    throw new Error(`Deployment health check failed: ${health.error}`);
  }

  return result.url;
}

async function generateDocsHelper(
  code: string,
  tools: any[]
): Promise<{
  readme: string;
  toolDocs: any[];
}> {
  // Use real Claude API to generate documentation
  return await generateDocs(code, tools);
}

// ============================================================================
// Actions
// ============================================================================

// Action to generate MCP server from OpenAPI spec
export const generateFromOpenAPI = action({
  args: {
    specUrl: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { specUrl, userId }): Promise<any> => {
    // Validate URL
    if (!isValidUrl(specUrl)) {
      throw new Error(`Invalid URL: ${specUrl}`);
    }

    // 1. Fetch and parse OpenAPI spec with timeout
    const specResponse = await fetchWithTimeout(specUrl);
    if (!specResponse.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${specResponse.statusText}`);
    }

    const spec = await specResponse.json();

    // 2. Extract basic info
    const name = spec.info?.title || "Generated API Server";
    const description = spec.info?.description || "MCP server generated from OpenAPI spec";
    const slug = generateSlug(name);

    // 3. Parse endpoints and schemas
    const endpoints = parseOpenAPIEndpoints(spec);
    const schemas = extractOpenAPISchemas(spec);

    // 4. Generate MCP tools using Claude API
    const { code: generatedCode, tools } = await generateMCPCode({
      name,
      description,
      endpoints,
      schemas,
      sourceType: "openapi",
    });

    // 5. Store draft in Convex
    const serverId: any = await ctx.runMutation(api.ai.createDraftServer, {
      userId,
      slug,
      name,
      description,
      sourceType: "openapi",
      sourceUrl: specUrl,
      code: generatedCode,
      tools,
    });

    return { serverId, preview: generatedCode };
  },
});

// Action to generate MCP server from documentation URL
export const generateFromDocsUrl = action({
  args: {
    docsUrl: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { docsUrl, userId }): Promise<any> => {
    // Validate URL
    if (!isValidUrl(docsUrl)) {
      throw new Error(`Invalid URL: ${docsUrl}`);
    }

    // 1. Fetch documentation page with timeout
    const docsResponse = await fetchWithTimeout(docsUrl);
    if (!docsResponse.ok) {
      throw new Error(`Failed to fetch documentation: ${docsResponse.statusText}`);
    }

    const docsHtml = await docsResponse.text();

    // 2. Use Claude to analyze documentation and generate MCP server
    const analysis = await analyzeAPIDocumentation(docsHtml, docsUrl);

    // 3. Use the code and tools generated by Claude directly
    const generatedCode = analysis.code;
    const tools = analysis.tools;

    // 4. Store draft
    const slug = generateSlug(analysis.name);
    const serverId: any = await ctx.runMutation(api.ai.createDraftServer, {
      userId,
      slug,
      name: analysis.name,
      description: analysis.description,
      sourceType: "docs_url",
      sourceUrl: docsUrl,
      code: generatedCode,
      tools,
    });

    return { serverId, preview: generatedCode };
  },
});

// Action to generate MCP server from GitHub repo
export const generateFromGitHubRepo = action({
  args: {
    repoUrl: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { repoUrl, userId }): Promise<any> => {
    // 1. Parse GitHub URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");
    }

    const [, owner, repo] = match;
    const repoName = repo.replace(/\.git$/, "");

    // 2. Fetch repository info with timeout and auth headers
    const repoInfo = await fetchWithTimeout(
      `https://api.github.com/repos/${owner}/${repoName}`,
      { headers: getGitHubHeaders() },
      GITHUB_TIMEOUT_MS
    );
    if (!repoInfo.ok) {
      if (repoInfo.status === 404) {
        throw new Error(`Repository not found: ${owner}/${repoName}`);
      }
      if (repoInfo.status === 403) {
        throw new Error("GitHub API rate limit exceeded. Please try again later.");
      }
      throw new Error(`Failed to fetch repository: ${repoInfo.statusText}`);
    }

    const repoData = await repoInfo.json();

    // 3. Analyze repository structure
    const analysis = await analyzeGitHubRepo(owner, repoName);

    // 4. Generate MCP code
    const { code: generatedCode, tools } = await generateMCPCode({
      name: repoData.name,
      description: repoData.description || "MCP server generated from GitHub repository",
      endpoints: analysis.endpoints,
      schemas: analysis.schemas,
      sourceType: "github_repo",
      baseUrl: analysis.baseUrl,
    });

    // 5. Store draft
    const slug = generateSlug(repoName);
    const serverId: any = await ctx.runMutation(api.ai.createDraftServer, {
      userId,
      slug,
      name: repoData.name,
      description: repoData.description || "Generated from GitHub",
      sourceType: "github_repo",
      sourceUrl: repoUrl,
      code: generatedCode,
      tools,
    });

    return { serverId, preview: generatedCode };
  },
});

// Action to deploy server to Vercel
export const deployServer = action({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, { serverId }) => {
    const server = await ctx.runQuery(api.ai.getServer, { serverId });
    if (!server) {
      throw new Error("Server not found");
    }

    // Update status to deploying
    await ctx.runMutation(api.ai.updateServerStatus, {
      serverId,
      status: "deploying",
    });

    try {
      // Deploy to Vercel
      const deploymentUrl = await deployToVercel(ctx, server);

      // Update status to deployed
      await ctx.runMutation(api.ai.updateServerStatus, {
        serverId,
        status: "deployed",
        deploymentUrl,
      });

      // Generate documentation (non-blocking, log errors but don't fail deployment)
      try {
        await ctx.runAction(api.aiActions.generateDocumentation, { serverId });
      } catch (docError) {
        console.error("Failed to generate documentation:", docError);
        // Documentation is optional, don't fail the whole deployment
      }

      return { url: deploymentUrl, status: "deployed" };
    } catch (error: any) {
      await ctx.runMutation(api.ai.updateServerStatus, {
        serverId,
        status: "failed",
      });
      throw new Error(`Deployment failed: ${error.message || "Unknown error"}`);
    }
  },
});

// Action to generate documentation
export const generateDocumentation = action({
  args: {
    serverId: v.id("generatedServers"),
  },
  handler: async (ctx, { serverId }) => {
    const server = await ctx.runQuery(api.ai.getServer, { serverId });
    if (!server) {
      throw new Error("Server not found");
    }

    // Generate documentation using Claude
    const docs = await generateDocsHelper(server.code, server.tools);

    // Update server with documentation
    await ctx.runMutation(api.ai.updateServerDocs, {
      serverId,
      readme: docs.readme,
      toolDocs: docs.toolDocs,
    });
  },
});
