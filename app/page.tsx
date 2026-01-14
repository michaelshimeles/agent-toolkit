import Link from "next/link";

export default async function Page() {
    return (
        <main className="flex flex-col min-h-[85vh] p-8 md:p-16 lg:p-24">
            <div className="max-w-4xl">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.1]">
                    Build tools for
                    <br />
                    AI agents
                </h1>

                <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                    Toolkit helps you create custom skills and MCP servers for Claude, Cursor, and any MCP-compatible client without the hassle of boilerplate.
                </p>

                <div className="mt-10">
                    <Link href="/dashboard" className="text-primary hover:text-primary/80 font-medium">
                        Open dashboard →
                    </Link>
                </div>
            </div>
        </main>
    )
}
