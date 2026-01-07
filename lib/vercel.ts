/**
 * Vercel API Integration
 * Provides utilities for deploying generated MCP servers to Vercel
 */

/**
 * Cross-platform base64 encoding that works in both Node.js and Convex runtime
 * Handles UTF-8 strings properly
 */
function toBase64(str: string): string {
  // Use TextEncoder to handle UTF-8 properly
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  // Convert Uint8Array to binary string
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Use btoa for base64 encoding (available in both browser and Convex runtime)
  return btoa(binary);
}

interface VercelDeployment {
  id: string;
  url: string;
  state: "BUILDING" | "READY" | "ERROR" | "CANCELED";
  readyState: "QUEUED" | "BUILDING" | "READY" | "ERROR" | "CANCELED";
  createdAt: number;
  buildingAt?: number;
  readyAt?: number;
  // Error details from Vercel API
  errorMessage?: string;
  errorCode?: string;
  errorStep?: string;
  errorLink?: string;
}

interface VercelProject {
  id: string;
  name: string;
  accountId: string;
  createdAt: number;
  framework: string | null;
  link?: {
    type: string;
    repo: string;
  };
}

interface VercelDeploymentFile {
  file: string;
  data: string;
  encoding: "base64";
}

/**
 * Get Vercel API client
 */
function getVercelClient(token?: string) {
  const apiToken = token || process.env.VERCEL_TOKEN;

  if (!apiToken) {
    throw new Error("VERCEL_TOKEN environment variable is not set");
  }

  const baseUrl = "https://api.vercel.com";

  return {
    token: apiToken,
    baseUrl,

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        const errorMessage = error.error?.message || error.message || response.statusText;
        const errorCode = error.error?.code || error.code || "";
        const details = errorCode ? `${errorMessage} (${errorCode})` : errorMessage;
        throw new Error(`Vercel API error: ${details}`);
      }

      return response.json();
    },
  };
}

/**
 * Create a new Vercel project
 */
export async function createVercelProject(params: {
  name: string;
  framework?: string;
  token?: string;
}): Promise<VercelProject> {
  const client = getVercelClient(params.token);

  const project = await client.request<VercelProject>("/v9/projects", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      framework: params.framework || null,
      // No build or output directory needed for Edge functions
      buildCommand: null,
      outputDirectory: null,
      installCommand: "npm install",
    }),
  });

  return project;
}

/**
 * Deploy files to Vercel
 */
export async function deployToVercel(params: {
  projectName: string;
  files: Record<string, string>;
  env?: Record<string, string>;
  token?: string;
}): Promise<VercelDeployment> {
  const client = getVercelClient(params.token);

  // Prepare files for deployment
  // Note: Vercel API requires 'encoding: base64' to properly decode the file content
  const deploymentFiles = Object.entries(params.files).map(([path, content]) => ({
    file: path,
    data: toBase64(content),
    encoding: "base64" as const,
  }));

  // Create deployment
  // For Edge functions, we don't need a build step or output directory
  // Vercel automatically handles TypeScript files in /api folder
  const deployment = await client.request<VercelDeployment>("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: params.projectName,
      files: deploymentFiles,
      projectSettings: {
        framework: null,
        buildCommand: null,
        outputDirectory: null,
        installCommand: "npm install",
      },
      env: params.env || {},
      target: "production",
    }),
  });

  return deployment;
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(params: {
  deploymentId: string;
  token?: string;
}): Promise<VercelDeployment> {
  const client = getVercelClient(params.token);

  const deployment = await client.request<VercelDeployment>(
    `/v13/deployments/${params.deploymentId}`
  );

  return deployment;
}

/**
 * Wait for deployment to complete
 */
export async function waitForDeployment(params: {
  deploymentId: string;
  timeout?: number;
  token?: string;
}): Promise<VercelDeployment> {
  const client = getVercelClient(params.token);
  const timeout = params.timeout || 300000; // 5 minutes default
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const deployment = await client.request<VercelDeployment>(
      `/v13/deployments/${params.deploymentId}`
    );

    if (deployment.readyState === "READY") {
      return deployment;
    }

    if (deployment.readyState === "ERROR" || deployment.readyState === "CANCELED") {
      const errorDetails = [
        `Deployment failed with state: ${deployment.readyState}`,
        deployment.errorMessage && `Message: ${deployment.errorMessage}`,
        deployment.errorCode && `Code: ${deployment.errorCode}`,
        deployment.errorStep && `Step: ${deployment.errorStep}`,
        deployment.errorLink && `Details: ${deployment.errorLink}`,
      ]
        .filter(Boolean)
        .join(". ");
      throw new Error(errorDetails);
    }

    // Wait 3 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Deployment timeout");
}

/**
 * List projects
 */
export async function listVercelProjects(params?: {
  limit?: number;
  token?: string;
}): Promise<{ projects: VercelProject[] }> {
  const client = getVercelClient(params?.token);
  const limit = params?.limit || 20;

  const response = await client.request<{ projects: VercelProject[] }>(
    `/v9/projects?limit=${limit}`
  );

  return response;
}

/**
 * Delete a project
 */
export async function deleteVercelProject(params: {
  projectId: string;
  token?: string;
}): Promise<void> {
  const client = getVercelClient(params.token);

  await client.request(`/v9/projects/${params.projectId}`, {
    method: "DELETE",
  });
}

/**
 * Get project by name
 */
export async function getVercelProject(params: {
  projectName: string;
  token?: string;
}): Promise<VercelProject | null> {
  const client = getVercelClient(params.token);

  try {
    const project = await client.request<VercelProject>(
      `/v9/projects/${params.projectName}`
    );
    return project;
  } catch (error: any) {
    if (error.message.includes("404") || error.message.includes("not found")) {
      return null;
    }
    throw error;
  }
}

interface VercelDomain {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  gitBranch?: string | null;
}

/**
 * Get project domains from Vercel
 */
export async function getProjectDomains(params: {
  projectName: string;
  token?: string;
}): Promise<VercelDomain[]> {
  const client = getVercelClient(params.token);

  try {
    const response = await client.request<{ domains: VercelDomain[] }>(
      `/v9/projects/${params.projectName}/domains`
    );
    return response.domains || [];
  } catch (error: any) {
    console.error("Failed to get project domains:", error.message);
    return [];
  }
}

/**
 * Prepare MCP server files for Vercel deployment
 */
export function prepareMCPServerFiles(params: {
  serverCode: string;
  serverName: string;
}): Record<string, string> {
  const files: Record<string, string> = {};

  // package.json - Edge runtime doesn't need a real build, just a no-op script
  files["package.json"] = JSON.stringify(
    {
      name: params.serverName,
      version: "1.0.0",
      type: "module",
      scripts: {
        build: "echo 'Edge runtime - no build required'",
      },
      dependencies: {
        elysia: "^1.2.0",
      },
    },
    null,
    2
  );

  // vercel.json - using Edge runtime for better performance
  // Use 'builds' to explicitly tell Vercel to handle this as serverless functions
  files["vercel.json"] = JSON.stringify(
    {
      version: 2,
      builds: [
        {
          src: "api/index.ts",
          use: "@vercel/node",
        },
      ],
      routes: [
        {
          src: "/(.*)",
          dest: "/api/index.ts",
        },
      ],
    },
    null,
    2
  );

  // Main server file - wrap with API key authentication
  files["api/index.ts"] = wrapServerCodeWithAuth(params.serverCode, params.serverName);

  // README
  files["README.md"] = `# ${params.serverName}

MCP Server generated and deployed via MCP Hub.

## Authentication

All requests to this MCP server require an API key. Get your API key from the MCP Hub dashboard.

Include the API key in requests using the \`X-API-Key\` header:

\`\`\`bash
curl -X POST ${params.serverName}.vercel.app/tools/call \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"name": "tool_name", "arguments": {}}'
\`\`\`

## Connecting to Claude Desktop

Add this to your Claude Desktop config:

\`\`\`json
{
  "mcpServers": {
    "${params.serverName}": {
      "url": "https://${params.serverName}.vercel.app",
      "headers": {
        "X-API-Key": "YOUR_API_KEY"
      }
    }
  }
}
\`\`\`

## Available Endpoints

- \`GET /\` - Health check
- \`GET /tools/list\` - List available tools (requires API key)
- \`POST /tools/call\` - Execute a tool (requires API key)
`;

  return files;
}

/**
 * Wrap generated server code with proper Vercel exports
 * 
 * The generated code from Claude already includes API key validation,
 * but exports app.handle which doesn't work properly with Vercel Edge.
 * This wrapper ensures the code uses app.fetch for proper Web API compatibility.
 */
function wrapServerCodeWithAuth(serverCode: string, serverName: string): string {
  // Remove any existing exports that use .handle (doesn't work with Edge)
  let fixedCode = serverCode
    .replace(/export const GET = app\.handle;?\s*/g, '')
    .replace(/export const POST = app\.handle;?\s*/g, '')
    .replace(/export const PUT = app\.handle;?\s*/g, '')
    .replace(/export const DELETE = app\.handle;?\s*/g, '')
    .replace(/export const PATCH = app\.handle;?\s*/g, '')
    .replace(/export const OPTIONS = app\.handle;?\s*/g, '')
    // Also handle variations with .fetch that might already exist
    .replace(/export const GET = .*app\.fetch.*;\s*/g, '')
    .replace(/export const POST = .*app\.fetch.*;\s*/g, '');
  
  // Add proper Vercel Edge-compatible exports
  return `// @ts-nocheck
${fixedCode}

// Vercel Edge Runtime exports
export const GET = (request) => app.fetch(request);
export const POST = (request) => app.fetch(request);
export const PUT = (request) => app.fetch(request);
export const DELETE = (request) => app.fetch(request);
export const PATCH = (request) => app.fetch(request);
export const OPTIONS = (request) => app.fetch(request);

export const runtime = "edge";
`;
}

/**
 * Deploy MCP server with health check
 */
export async function deployMCPServer(params: {
  serverName: string;
  serverCode: string;
  env?: Record<string, string>;
  token?: string;
}): Promise<{
  deployment: VercelDeployment;
  url: string;
}> {
  // Prepare files
  const files = prepareMCPServerFiles({
    serverCode: params.serverCode,
    serverName: params.serverName,
  });

  // Deploy to Vercel
  const deployment = await deployToVercel({
    projectName: params.serverName,
    files,
    env: params.env,
    token: params.token,
  });

  // Wait for deployment to be ready
  const readyDeployment = await waitForDeployment({
    deploymentId: deployment.id,
    token: params.token,
  });

  // Get the production domain from the project's domains list
  // The deployment URL has a hash (e.g., project-abc123-team.vercel.app)
  // but we want the stable production domain (e.g., project-api.vercel.app)
  let productionUrl = `https://${readyDeployment.url}`;
  
  try {
    const domains = await getProjectDomains({
      projectName: params.serverName,
      token: params.token,
    });
    
    console.log("Project domains:", JSON.stringify(domains, null, 2));
    
    if (domains.length > 0) {
      // The first domain in the list is typically the production domain
      // It should be the stable .vercel.app URL without the deployment hash
      const primaryDomain = domains[0];
      productionUrl = `https://${primaryDomain.name}`;
      console.log("Using production domain:", productionUrl);
    }
  } catch (error) {
    console.error("Failed to get production domain, using deployment URL:", error);
  }

  return {
    deployment: readyDeployment,
    url: productionUrl,
  };
}

/**
 * Check MCP server health
 * 
 * Note: We consider the server healthy if it responds at all, even with auth errors (401/403).
 * This is because generated MCP servers may not have a dedicated /health endpoint and
 * may require authentication for all routes. A response indicates the server is running.
 */
export async function checkMCPServerHealth(url: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  try {
    // Try the root endpoint first since generated servers may not have /health
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Consider any response (including 401/403/404) as "server is running"
    // Only network errors or 5xx errors indicate actual problems
    if (response.status >= 500) {
      return {
        ok: false,
        error: `Health check failed with status ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: error.message || "Health check failed",
    };
  }
}
