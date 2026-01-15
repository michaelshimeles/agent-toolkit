import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BuilderPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">MCP</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Create from templates or generate with AI
            </p>
          </div>
          <Link
            href="/dashboard/builder/new"
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
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
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Server
          </Link>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/integrations"
            className="group p-6 border rounded-lg hover:border-foreground/20 transition-colors"
          >
            <h2 className="text-sm font-semibold mb-2">Templates</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pre-built servers for GitHub, Slack, Linear, and more.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 bg-muted rounded">GitHub</span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded">Slack</span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded">Linear</span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground">+10</span>
            </div>
          </Link>

          <Link
            href="/dashboard/builder/new"
            className="group p-6 border rounded-lg hover:border-foreground/20 transition-colors"
          >
            <h2 className="text-sm font-semibold mb-2">AI Builder</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Generate from OpenAPI specs, docs, or GitHub repos.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 bg-muted rounded">OpenAPI</span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded">Docs</span>
              <span className="text-xs px-2 py-0.5 bg-muted rounded">GitHub</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
