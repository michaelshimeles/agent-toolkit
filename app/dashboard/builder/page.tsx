import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BuilderPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:py-14">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">MCP</h1>
            <p className="text-base text-muted-foreground mt-2">
              Create from templates or generate with AI
            </p>
          </div>
          <Link
            href="/dashboard/builder/new"
            className="h-10 px-5 text-sm bg-primary text-primary-foreground rounded-full hover:brightness-110 flex items-center gap-2 shadow-sm active:scale-[0.98]"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div
            className="group p-6 bg-card border border-border/50 rounded-xl opacity-50 cursor-not-allowed relative"
          >
            <span className="absolute top-4 right-4 text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full font-medium">
              Coming Soon
            </span>
            <h2 className="text-base font-semibold mb-2 tracking-tight">Templates</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Pre-built servers for GitHub, Slack, Linear, and more.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 bg-muted rounded-full">GitHub</span>
              <span className="text-xs px-3 py-1 bg-muted rounded-full">Slack</span>
              <span className="text-xs px-3 py-1 bg-muted rounded-full">Linear</span>
              <span className="text-xs px-3 py-1 bg-muted rounded-full text-muted-foreground">+10</span>
            </div>
          </div>

          <Link
            href="/dashboard/builder/new"
            className="group p-6 bg-card border border-border/50 rounded-xl hover:border-border hover:shadow-md transition-all duration-200"
          >
            <h2 className="text-base font-semibold mb-2 tracking-tight">AI Builder</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Generate from OpenAPI specs, docs, or GitHub repos.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs px-3 py-1 bg-muted rounded-full">OpenAPI</span>
              <span className="text-xs px-3 py-1 bg-muted rounded-full">Docs</span>
              <span className="text-xs px-3 py-1 bg-muted rounded-full">GitHub</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
