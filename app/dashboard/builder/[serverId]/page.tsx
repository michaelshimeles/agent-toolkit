"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { LoadingPage } from "@/components/loading";
import { ShareDialog } from "@/components/sharing/share-dialog";
import { ApiKeyDialog } from "@/components/api-key-dialog";
import ReactMarkdown from "react-markdown";

export const dynamic = 'force-dynamic';

export default function ServerDetailPage() {
  const { user } = useUser();
  const params = useParams();
  const serverId = params.serverId as string;

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<number>(0);
  const [allowedDomains, setAllowedDomains] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [codeExpanded, setCodeExpanded] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);

  // Get user's Convex ID
  const convexUser = useQuery(api.auth.getUserByClerkId, { 
    clerkId: user?.id || "" 
  }, { skip: !user?.id });

  // Get server details
  const server = useQuery(
    api.ai.getServer,
    serverId ? { serverId: serverId as any } : "skip"
  );

  // Deploy action
  const deployServer = useAction(api.ai.deployServer);

  // Initialize local state from server data
  useEffect(() => {
    if (server) {
      setRateLimit(server.rateLimit || 0);
      setAllowedDomains(server.allowedDomains?.join("\n") || "");
      
      // Check if server requires external API key and hasn't been set up
      if (server.requiresExternalApiKey && !showApiKeyDialog) {
        setShowApiKeyDialog(true);
      }
    }
  }, [server]);

  const handleDeploy = async () => {
    if (!server) return;

    setIsDeploying(true);
    setDeployError(null);

    try {
      const result = await deployServer({ serverId: server._id });
      // Refresh page to show deployment status
      window.location.reload();
    } catch (err: any) {
      setDeployError(err.message || "Deployment failed");
    } finally {
      setIsDeploying(false);
    }
  };

  if (!user || !server) {
    return <LoadingPage />;
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Toast notification */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-400"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className="text-sm font-medium">Config copied to clipboard!</span>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <a
            href="/dashboard/builder"
            className="text-primary hover:text-primary/80 mb-2 inline-block"
          >
            ← Back to Builder
          </a>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-3xl font-bold mb-2">{server.name}</h1>
              <p className="text-muted-foreground">{server.description}</p>
            </div>
            <ShareDialog serverId={serverId} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* API Structure */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Detected API Structure</h2>

              <div className="space-y-4">
                <div className="text-sm text-muted-foreground mb-4">
                  Found {server.tools.length} endpoints. Select which to include as MCP tools:
                </div>

                {server.tools.map((tool: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 border rounded-lg"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1"
                      disabled={server.status === "deployed"}
                    />
                    <div className="flex-1">
                      <div className="font-mono text-sm font-semibold">
                        {tool.name}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                ))}

                {server.tools.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tools detected. The API analysis may need refinement.
                  </div>
                )}
              </div>
            </div>

            {/* Generated Code Preview */}
            <div className="bg-card rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Generated Code</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(server.code);
                      setCodeCopied(true);
                      setTimeout(() => setCodeCopied(false), 2000);
                    }}
                    className="px-3 py-1.5 text-xs bg-muted hover:bg-accent rounded-md flex items-center gap-1.5 transition-colors"
                  >
                    {codeCopied ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-green-500"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {server.code.split('\n').length} lines
                  </span>
                </div>
              </div>
              <div className="relative">
                <div 
                  className={`bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto transition-all duration-300 ${
                    codeExpanded ? 'max-h-none' : 'max-h-[300px] overflow-hidden'
                  }`}
                >
                  <pre className="text-sm">
                    <code>{server.code}</code>
                  </pre>
                </div>
                {!codeExpanded && server.code.split('\n').length > 15 && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-zinc-900 to-transparent rounded-b-lg pointer-events-none" />
                )}
              </div>
              {server.code.split('\n').length > 15 && (
                <button
                  onClick={() => setCodeExpanded(!codeExpanded)}
                  className="mt-3 w-full py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-2 transition-colors"
                >
                  {codeExpanded ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m18 15-6-6-6 6"/>
                      </svg>
                      Show Less
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                      Show More ({server.code.split('\n').length} lines)
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Documentation (if deployed) */}
            {server.readme && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Auto-Generated Documentation</h2>
                  <span className="text-xs text-muted-foreground">
                    {server.readme.split('\n').length} lines
                  </span>
                </div>
                <div className="relative">
                  <div 
                    className={`prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3 prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-3 prose-p:leading-relaxed prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:my-4 transition-all duration-300 ${
                      docsExpanded ? 'max-h-none' : 'max-h-[400px] overflow-hidden'
                    }`}
                  >
                    <ReactMarkdown>{server.readme}</ReactMarkdown>
                  </div>
                  {!docsExpanded && server.readme.split('\n').length > 20 && (
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                  )}
                </div>
                {server.readme.split('\n').length > 20 && (
                  <button
                    onClick={() => setDocsExpanded(!docsExpanded)}
                    className="mt-3 w-full py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-2 transition-colors"
                  >
                    {docsExpanded ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m18 15-6-6-6 6"/>
                        </svg>
                        Show Less
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                        Show More
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Status</h3>

              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Server Status</div>
                  <div
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      server.status === "deployed"
                        ? "bg-green-500/10 text-green-500"
                        : server.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {server.status}
                  </div>
                </div>

                {server.deploymentUrl && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      Domain
                    </div>
                    <a
                      href={server.deploymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 text-sm break-all"
                    >
                      {server.deploymentUrl}
                    </a>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Source Type</div>
                  <div className="text-sm font-medium">{server.sourceType}</div>
                </div>

                {server.sourceUrl && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Source URL</div>
                    <a
                      href={server.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 text-sm break-all"
                    >
                      {server.sourceUrl}
                    </a>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Tools</div>
                  <div className="text-sm font-medium">{server.tools.length}</div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Version</div>
                  <div className="text-sm font-medium">v{server.version}</div>
                </div>
              </div>
            </div>

            {/* Security Config */}
            <div className="bg-card rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Security Configuration</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rate Limit (requests/min)
                  </label>
                  <input
                    type="number"
                    value={rateLimit}
                    onChange={(e) => setRateLimit(parseInt(e.target.value) || 0)}
                    placeholder="0 = no limit"
                    min={0}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm"
                    disabled={server.status === "deployed"}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Set to 0 for no rate limit (API key required for security)
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Allowed Domains
                  </label>
                  <textarea
                    placeholder="api.example.com (one per line)"
                    value={allowedDomains}
                    onChange={(e) => setAllowedDomains(e.target.value)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm h-24"
                    disabled={server.status === "deployed"}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Restrict API calls to these domains (optional)
                  </div>
                </div>
              </div>
            </div>

            {/* Deploy Button */}
            <div className="bg-card rounded-lg border p-6">
              {deployError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {deployError}
                </div>
              )}

              {server.status === "deployed" ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Connect to Claude Desktop:
                  </div>
                  <div className="bg-zinc-900 text-zinc-100 p-3 rounded-lg text-xs overflow-x-auto">
                    <pre>
                      {JSON.stringify(
                        {
                          mcpServers: {
                            [server.slug]: {
                              url: server.deploymentUrl,
                              headers: {
                                "X-API-Key": "YOUR_API_KEY"
                              }
                            },
                          },
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0 mt-0.5"
                      >
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M3.586 20.414A2 2 0 0 0 5.414 22h13.172a2 2 0 0 0 1.828-2.586l-6.586-14a2 2 0 0 0-3.656 0l-6.586 14Z" />
                      </svg>
                      <span>
                        Replace <code className="font-mono bg-amber-500/20 px-1 rounded">YOUR_API_KEY</code> with your API key from the{" "}
                        <a href="/dashboard/api-keys" className="underline hover:text-amber-500">API Keys</a> page.
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          JSON.stringify(
                            {
                              mcpServers: {
                                [server.slug]: {
                                  url: server.deploymentUrl,
                                  headers: {
                                    "X-API-Key": "YOUR_API_KEY"
                                  }
                                },
                              },
                            },
                            null,
                            2
                          )
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex-1 bg-muted text-foreground py-2 px-4 rounded-lg font-semibold hover:bg-accent transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-green-500"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDeploy}
                      disabled={isDeploying}
                      className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      {isDeploying ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Redeploying...
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                            <path d="M16 16h5v5" />
                          </svg>
                          Redeploy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {server.tools.length === 0 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm">
                      No tools detected. The generated server will use the base template. You can still deploy and manually add tools later.
                    </div>
                  )}
                  {rateLimit === 0 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400 text-sm">
                      No rate limit set. Your API key will be used for authentication.
                    </div>
                  )}
                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg font-semibold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeploying ? "Deploying..." : "Deploy Server →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* API Key Dialog */}
      {server && convexUser && server.requiresExternalApiKey && (
        <ApiKeyDialog
          isOpen={showApiKeyDialog}
          onClose={() => setShowApiKeyDialog(false)}
          userId={convexUser._id}
          serverId={server._id}
          serviceName={server.externalApiService || ""}
          serviceUrl={server.externalApiKeyUrl || undefined}
          instructions={server.externalApiKeyInstructions || undefined}
          onSuccess={() => {
            // Refresh server data after key is saved
            // Server query will automatically re-fetch
          }}
        />
      )}
    </div>
  );
}
