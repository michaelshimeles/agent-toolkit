import Link from "next/link";

export default async function Page() {
    return (
        <main className="min-h-[calc(100vh-57px)] flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
                    Build tools for AI agents
                </h1>

                <p className="mt-4 text-muted-foreground">
                    Create custom skills and MCP servers for Claude, Cursor, and any MCP-compatible client.
                </p>

                <div className="mt-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity"
                    >
                        Open dashboard
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
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
            </div>
        </main>
    )
}
