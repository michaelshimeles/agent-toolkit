import Link from "next/link";

export default async function Page() {
    return (
        <main className="flex flex-col min-h-[85vh] px-8 md:px-16 lg:px-24 pt-24 md:pt-32">
            <div className="max-w-3xl">
                <h1 className="text-[2.75rem] md:text-[3.5rem] lg:text-[4rem] font-semibold tracking-[-0.02em] leading-[1.1]">
                    Build tools for
                    <br />
                    AI agents
                </h1>

                <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                    Toolkit helps you create custom skills and MCP servers for Claude, Cursor, and any MCP-compatible client without the hassle of boilerplate.
                </p>

                <div className="mt-8">
                    <Link href="/dashboard" className="text-primary hover:text-primary/80 text-sm font-medium">
                        Open dashboard →
                    </Link>
                </div>
            </div>
        </main>
    )
}
