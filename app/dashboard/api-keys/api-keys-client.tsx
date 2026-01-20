"use client";

import { useState, useEffect } from "react";

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      console.error("Failed to fetch keys:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Load API keys on mount
  useEffect(() => {
    fetchKeys(true);
  }, []);

  const createKey = async () => {
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedKey(data.apiKey);
        setNewKeyName("");
        fetchKeys();
      }
    } catch (error) {
      console.error("Failed to create key:", error);
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;

    try {
      const response = await fetch(`/api/keys?id=${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (error) {
      console.error("Failed to revoke key:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="min-h-screen px-6 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">API Keys</h1>
          <p className="text-base text-muted-foreground mt-2">
            Manage your API keys for authentication
          </p>
        </div>

      {/* Created Key Modal */}
      {createdKey && (
        <div className="mb-10 p-6 border border-green-500/20 bg-green-500/10 rounded-2xl">
          <h3 className="font-semibold text-green-500 mb-2 text-lg">
            API Key Created Successfully!
          </h3>
          <p className="text-sm text-green-500/80 mb-5">
            Copy and save this key somewhere safe. You won't be able to see it again.
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-grow p-4 bg-background border border-border/50 rounded-xl font-mono text-sm break-all">
              {createdKey}
            </code>
            <button
              onClick={() => copyToClipboard(createdKey)}
              className="h-10 px-5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all active:scale-[0.98]"
            >
              Copy
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-5 text-sm text-green-500 hover:text-green-400"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Key */}
      <div className="mb-10 p-6 border border-border/50 rounded-2xl bg-card">
        <h2 className="font-semibold text-lg mb-5 tracking-tight">Create New API Key</h2>
        <div className="flex gap-4">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g., Production, Development)"
            className="flex-grow h-10 px-4 border border-border/50 bg-card rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={createKey}
            disabled={creatingKey || !newKeyName.trim()}
            className="h-10 px-5 bg-primary text-primary-foreground rounded-full hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
          >
            {creatingKey ? "Creating..." : "Create Key"}
          </button>
        </div>
      </div>

      {/* Existing Keys */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-lg tracking-tight">Your API Keys</h2>
          <button
            onClick={() => fetchKeys()}
            disabled={loading}
            className="text-sm text-accent hover:text-accent/80"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {initialLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border/50 rounded-2xl bg-card">
            <p className="text-sm text-muted-foreground">
              No API keys created yet
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div
                key={key._id}
                className="flex items-center justify-between p-5 border border-border/50 rounded-xl bg-card hover:border-border hover:shadow-md transition-all duration-200"
              >
                <div>
                  <h3 className="font-medium">{key.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created: {new Date(key._creationTime).toLocaleDateString()}
                  </p>
                  {key.lastUsed && (
                    <p className="text-xs text-muted-foreground">
                      Last used: {new Date(key.lastUsed).toLocaleString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => revokeKey(key._id)}
                  className="h-8 px-4 text-sm bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-all active:scale-[0.98]"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="mt-10 p-6 bg-muted rounded-2xl space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Usage Instructions</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your API key is used to authenticate requests to deployed MCP servers.
          </p>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">1. Claude Desktop Configuration</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Add your deployed MCP server to Claude Desktop with the API key in headers:
          </p>
          <pre className="p-4 bg-zinc-900 text-zinc-100 rounded overflow-x-auto text-sm">
            {`{
  "mcpServers": {
    "your-server-name": {
      "url": "https://your-server.vercel.app",
      "headers": {
        "X-API-Key": "YOUR_API_KEY_HERE"
      }
    }
  }
}`}
          </pre>
        </div>

        <div>
          <h4 className="font-medium text-sm mb-2">2. Direct API Calls</h4>
          <p className="text-xs text-muted-foreground mb-2">
            Include the API key in the <code className="px-1 py-0.5 bg-zinc-800 text-zinc-200 rounded">X-API-Key</code> header:
          </p>
          <pre className="p-4 bg-zinc-900 text-zinc-100 rounded overflow-x-auto text-sm">
            {`curl -X POST https://your-server.vercel.app/tools/call \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -d '{"name": "tool_name", "arguments": {}}'`}
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
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>
              <strong>Security:</strong> Never share your API key publicly or commit it to version control.
              Use environment variables or secrets management in production.
            </span>
          </p>
        </div>
      </div>
      </div>
    </main>
  );
}
