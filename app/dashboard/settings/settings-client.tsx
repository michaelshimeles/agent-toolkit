"use client";

import { useState, useEffect } from "react";

export default function SettingsClient() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasAnthropicApiKey);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveApiKey = async () => {
    if (!apiKey.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/anthropic-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (response.ok) {
        setHasApiKey(true);
        setApiKey("");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save API key");
      }
    } catch (err) {
      console.error("Failed to save API key:", err);
      setError("Failed to save API key");
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKey = async () => {
    if (!confirm("Are you sure you want to delete your Anthropic API key?")) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/anthropic-key", {
        method: "DELETE",
      });

      if (response.ok) {
        setHasApiKey(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to delete API key");
      }
    } catch (err) {
      console.error("Failed to delete API key:", err);
      setError("Failed to delete API key");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="min-h-screen px-6 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-base text-muted-foreground mt-2">
            Configure your account settings
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-10 p-6 border border-green-500/20 bg-green-500/10 rounded-2xl">
            <h3 className="font-semibold text-green-500 mb-1 text-lg">
              API Key Saved Successfully!
            </h3>
            <p className="text-sm text-green-500/80">
              Your Anthropic API key has been saved and will be used for AI generation features.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-10 p-6 border border-red-500/20 bg-red-500/10 rounded-2xl">
            <h3 className="font-semibold text-red-500 mb-1 text-lg">Error</h3>
            <p className="text-sm text-red-500/80">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-3 text-sm text-red-500 hover:text-red-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Anthropic API Key Section */}
        <div className="mb-10 p-6 border border-border/50 rounded-2xl bg-card">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-semibold text-lg tracking-tight">Anthropic API Key</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Add your Anthropic API key to use AI-powered features like MCP server generation.
              </p>
            </div>
            {hasApiKey && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-500 text-sm rounded-full">
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
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Configured
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            </div>
          ) : hasApiKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-xl">
                <div className="flex-grow">
                  <p className="text-sm font-medium">API Key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    sk-ant-•••••••••••••••••••••••••••••••
                  </p>
                </div>
                <button
                  onClick={deleteApiKey}
                  disabled={deleting}
                  className="h-8 px-4 text-sm bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                To update your API key, delete the current one and add a new one.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-grow h-10 px-4 border border-border/50 bg-card rounded-xl focus:outline-none focus:ring-2 focus:ring-ring font-mono text-sm"
                />
                <button
                  onClick={saveApiKey}
                  disabled={saving || !apiKey.trim()}
                  className="h-10 px-5 bg-primary text-primary-foreground rounded-full hover:brightness-110 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm"
                >
                  {saving ? "Saving..." : "Save Key"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="p-6 bg-muted rounded-2xl space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Why do I need an API key?</h3>
            <p className="text-sm text-muted-foreground">
              Your Anthropic API key is used to power the AI features in this application,
              such as generating MCP servers from documentation, OpenAPI specs, or GitHub repositories.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2">How to get an API key</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Go to{" "}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  console.anthropic.com
                </a>
              </li>
              <li>Sign in or create an account</li>
              <li>Navigate to Settings → API Keys</li>
              <li>Click "Create Key" and copy the generated key</li>
              <li>Paste the key above</li>
            </ol>
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
                <strong>Security:</strong> Your API key is encrypted before storage and is never
                exposed to the client. Usage charges will apply to your Anthropic account.
              </span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
