import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function BuilderPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main className="flex flex-col min-h-screen p-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">MCP Servers</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Create MCP servers from templates or generate custom ones with AI
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
        <Link
          href="/dashboard/integrations"
          className="group p-8 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="text-4xl mb-4">🔌</div>
          <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            Templates
          </h2>
          <p className="text-sm text-muted-foreground">
            Pre-built MCP servers for GitHub, Slack, Linear, Stripe, and more. Connect with one click.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-muted rounded">GitHub</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">Slack</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">Linear</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">+10 more</span>
          </div>
        </Link>

        <Link
          href="/dashboard/builder/new"
          className="group p-8 border rounded-lg hover:border-primary/50 hover:bg-accent/50 transition-all"
        >
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            AI Builder
          </h2>
          <p className="text-sm text-muted-foreground">
            Generate custom MCP servers from OpenAPI specs, documentation URLs, or GitHub repos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 bg-muted rounded">OpenAPI</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">Docs URL</span>
            <span className="text-xs px-2 py-1 bg-muted rounded">GitHub</span>
          </div>
        </Link>
      </div>
    </main>
  );
}
