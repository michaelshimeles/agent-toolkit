import Link from "next/link";

export default async function Page() {
    return (
        <main className="min-h-screen">
            {/* Hero Section */}
            <section className="px-6 md:px-12 lg:px-24 pt-32 pb-24 max-w-5xl">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-[-0.025em] leading-[1.15]">
                    Build tools for
                    <br />
                    AI agents
                </h1>

                <p className="mt-6 text-lg text-muted-foreground leading-[1.6] max-w-xl">
                    Create custom skills and MCP servers for Claude, Cursor,
                    and any MCP-compatible client.
                </p>

                <div className="mt-8 flex items-center gap-6">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity"
                    >
                        Open dashboard
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            className="translate-y-px"
                        >
                            <path
                                d="M6.5 3.5L11 8L6.5 12.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                </div>
            </section>

            {/* Features Section */}
            <section className="px-6 md:px-12 lg:px-24 py-24 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl">
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Skills</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Create agent skills that extend Claude Code with custom capabilities, workflows, and domain knowledge.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold mb-3">MCP Servers</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Generate MCP servers from OpenAPI specs, documentation, or GitHub repos with AI.
                        </p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold mb-3">Integrations</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Connect to GitHub, Slack, Linear, Stripe, and more through pre-built templates.
                        </p>
                    </div>
                </div>
            </section>
        </main>
    )
}
