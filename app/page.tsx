import Link from "next/link";

export default async function Page() {
    return (
        <main className="min-h-[calc(100vh-65px)] flex items-center justify-center px-6">
            <div className="text-center max-w-2xl">
                <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                    Build tools for AI agents
                </h1>

                <p className="mt-5 text-lg text-muted-foreground">
                    Create custom skills and MCP servers for Claude, Cursor, and any MCP-compatible client.
                </p>

                <div className="mt-10">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-primary text-primary-foreground rounded-full text-base font-medium hover:brightness-110 transition-all duration-150 active:scale-[0.98] shadow-sm"
                    >
                        Open dashboard
                        <svg
                            width="18"
                            height="18"
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
