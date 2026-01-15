"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LoadingCard } from "@/components/loading";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BuilderClientProps {
  clerkId: string;
}

type SourceType = "openapi" | "docs_url" | "github_repo" | "postman" | "text";

export default function BuilderClient({ clerkId }: BuilderClientProps) {
  const [sourceType, setSourceType] = useState<SourceType>("openapi");
  const [sourceInput, setSourceInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>("");
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Get Convex user
  const convexUser = useQuery(api.auth.getUserByClerkId, { clerkId });

  // Ensure user exists in Convex database
  const ensureUser = useMutation(api.auth.ensureUser);
  useEffect(() => {
    if (isLoaded && user && convexUser === null) {
      ensureUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [isLoaded, user, convexUser, ensureUser]);

  // Get user's generated servers
  const generatedServers = useQuery(
    api.builder.listUserServers,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Convex actions for generating MCP servers
  const generateFromOpenAPI = useAction(api.aiActions.generateFromOpenAPI);
  const generateFromDocsUrl = useAction(api.aiActions.generateFromDocsUrl);
  const generateFromGitHubRepo = useAction(api.aiActions.generateFromGitHubRepo);
  const deleteServer = useMutation(api.builder.deleteServer);

  // State for delete dialog
  const [serverToDelete, setServerToDelete] = useState<{
    id: Id<"generatedServers">;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteServer = async () => {
    if (!serverToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteServer({ serverId: serverToDelete.id });
      setServerToDelete(null);
    } catch (err) {
      console.error("Failed to delete server:", err);
      setError(err instanceof Error ? err.message : "Failed to delete server");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAnalyze = async () => {
    if (!sourceInput.trim()) {
      setError("Please enter a URL or description to analyze.");
      return;
    }
    
    if (!convexUser) {
      setError("User profile not found. Please refresh the page or sign in again.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisStatus("Starting analysis...");

    try {
      let result;

      switch (sourceType) {
        case "openapi":
          setAnalysisStatus("Fetching OpenAPI spec and generating MCP server...");
          result = await generateFromOpenAPI({
            specUrl: sourceInput,
            userId: convexUser._id,
          });
          break;

        case "docs_url":
          setAnalysisStatus("Analyzing documentation and generating MCP server...");
          result = await generateFromDocsUrl({
            docsUrl: sourceInput,
            userId: convexUser._id,
          });
          break;

        case "github_repo":
          setAnalysisStatus("Analyzing GitHub repository...");
          result = await generateFromGitHubRepo({
            repoUrl: sourceInput,
            userId: convexUser._id,
          });
          break;

        case "postman":
          setError("Postman collection import is coming soon!");
          return;

        case "text":
          setError("Plain text generation is coming soon!");
          return;

        default:
          setError("Please select a valid source type");
          return;
      }

      if (result?.serverId) {
        setAnalysisStatus("MCP server created successfully!");
        setSourceInput("");
        // Navigate to the server editor
        router.push(`/dashboard/builder/${result.serverId}`);
      }
    } catch (err) {
      console.error("Failed to analyze:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze API. Please check your input and try again.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus("");
    }
  };

  return (
    <main className="flex flex-col h-screen p-12">
      <div className="mb-8">
        <button
          onClick={() => router.push("/dashboard/builder")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
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
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to MCP Servers
        </button>
        <h1 className="text-2xl font-bold">AI Builder</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Create MCP servers from any API automatically
        </p>
      </div>

      {/* Input Section */}
      <div className="border rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Create MCP Server from API</h2>

        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Choose input type:</label>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "openapi", label: "OpenAPI Spec" },
              { value: "docs_url", label: "Documentation URL" },
              { value: "github_repo", label: "GitHub Repo" },
              { value: "postman", label: "Postman Collection" },
              { value: "text", label: "Plain Text" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSourceType(option.value as SourceType)}
                className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                  sourceType === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          {sourceType === "text" ? (
            <textarea
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder="Describe the API you want to create an MCP server for..."
              className="w-full h-32 px-4 py-2 border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <input
              type="text"
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              placeholder={
                sourceType === "openapi"
                  ? "https://api.example.com/openapi.json"
                  : sourceType === "docs_url"
                    ? "https://docs.example.com/api"
                    : sourceType === "github_repo"
                      ? "https://github.com/owner/repo"
                      : "https://www.postman.com/collection/..."
              }
              className="w-full px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          )}
        </div>

        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !sourceInput.trim() || convexUser === undefined}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isAnalyzing && (
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
          )}
          {isAnalyzing ? "Analyzing..." : convexUser === undefined ? "Loading..." : "Analyze API"}
        </button>

        {isAnalyzing && analysisStatus && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-sm text-blue-400 flex items-center gap-2">
              <svg className="animate-pulse h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              {analysisStatus}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {convexUser === null && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">
              Your user profile is not fully set up. Please sign out and sign in again to initialize your account.
            </p>
          </div>
        )}
      </div>

      {/* Generated Servers Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Your MCP Servers</h2>

        {generatedServers === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <LoadingCard />
            <LoadingCard />
          </div>
        ) : generatedServers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg">
            <p className="text-sm text-muted-foreground">
              No MCP servers created yet. Analyze an API to get started!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {generatedServers.map((server: any) => (
              <div
                key={server._id}
                onClick={() => router.push(`/dashboard/builder/${server._id}`)}
                className="flex flex-col p-6 border rounded-lg bg-card hover:bg-accent transition-colors group relative cursor-pointer"
              >
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setServerToDelete({ id: server._id, name: server.name });
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                  title="Delete server"
                >
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
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    <line x1="10" x2="10" y1="11" y2="17" />
                    <line x1="14" x2="14" y1="11" y2="17" />
                  </svg>
                </button>

                <div className="flex items-start justify-between mb-4 pr-8">
                  <div>
                    <h3 className="font-semibold text-lg">{server.name}</h3>
                    <span className="text-xs px-2 py-1 bg-muted rounded">
                      {server.sourceType}
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      server.status === "deployed"
                        ? "bg-green-500/10 text-green-500"
                        : server.status === "failed"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-yellow-500/10 text-yellow-500"
                    }`}
                  >
                    {server.status}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-4 flex-grow">
                  {server.description}
                </p>

                {server.tools && server.tools.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-2">
                      {server.tools.length} tools available
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {server.tools.slice(0, 3).map((tool: any) => (
                        <span
                          key={tool.name}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                        >
                          {tool.name}
                        </span>
                      ))}
                      {server.tools.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                          +{server.tools.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {server.deploymentUrl && (
                  <div className="text-xs text-muted-foreground truncate">
                    {server.deploymentUrl}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={serverToDelete !== null} onOpenChange={(open) => !open && setServerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-500/10">
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
                className="text-red-500"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </AlertDialogMedia>
            <AlertDialogTitle>Delete MCP Server</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{serverToDelete?.name}</strong>? This action cannot be undone and will permanently remove the server and all its configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteServer}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? "Deleting..." : "Delete Server"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
