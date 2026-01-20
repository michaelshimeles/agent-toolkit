import Link from "next/link";

export default async function Page() {
    const features = [
        {
            title: "MCP Servers",
            description: "Generate MCP servers from OpenAPI specs, documentation, or GitHub repos. Deploy instantly to connect any API to your AI tools.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="8" x="2" y="2" rx="2" ry="2"/>
                    <rect width="20" height="8" x="2" y="14" rx="2" ry="2"/>
                    <line x1="6" x2="6.01" y1="6" y2="6"/>
                    <line x1="6" x2="6.01" y1="18" y2="18"/>
                </svg>
            ),
        },
        {
            title: "Agent Skills",
            description: "Create custom skills that extend Claude Code's capabilities. Add specialized knowledge, workflows, and tool integrations.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <path d="m10 13-2 2 2 2"/>
                    <path d="m14 17 2-2-2-2"/>
                </svg>
            ),
        },
        {
            title: "One-Click Deploy",
            description: "Deploy to the cloud with a single click. Get a hosted endpoint for your MCP server that works with Claude Desktop and Cursor.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                    <path d="M22 10a3 3 0 0 0-3-3h-2.207a5.502 5.502 0 0 0-10.702.5"/>
                </svg>
            ),
        },
    ];

    const steps = [
        { step: "1", title: "Describe your API", description: "Paste an OpenAPI spec, docs URL, or GitHub repo" },
        { step: "2", title: "AI generates tools", description: "We create type-safe MCP tools from your API" },
        { step: "3", title: "Deploy & connect", description: "One-click deploy, then add to Claude or Cursor" },
    ];

    return (
        <main className="min-h-[calc(100vh-65px)]">
            {/* Hero */}
            <section className="px-6 py-20 md:py-28">
                <div className="max-w-3xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
                        Give your AI agents superpowers
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Build MCP servers and custom skills that let Claude, Cursor, and other AI tools interact with any API or service.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-primary text-primary-foreground rounded-full text-base font-medium hover:brightness-110 transition-all duration-150 active:scale-[0.98] shadow-sm"
                        >
                            Start building
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                                <path d="M6.5 3.5L11 8L6.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </Link>
                        <a
                            href="https://modelcontextprotocol.io"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-secondary text-secondary-foreground rounded-full text-base font-medium hover:bg-secondary/80 transition-all duration-150"
                        >
                            Learn about MCP
                        </a>
                    </div>
                </div>
            </section>

            {/* What is MCP */}
            <section className="px-6 py-16 border-t border-border/50">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        What is MCP?
                    </h2>
                    <p className="mt-4 text-muted-foreground text-lg">
                        Model Context Protocol is an open standard that lets AI assistants connect to external tools and data sources.
                        Instead of copy-pasting data into chat, your AI can directly query databases, call APIs, and execute actions.
                    </p>
                </div>
            </section>

            {/* Features */}
            <section className="px-6 py-16 border-t border-border/50">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-12">
                        Everything you need to extend AI capabilities
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {features.map((feature) => (
                            <div
                                key={feature.title}
                                className="p-6 bg-card border border-border/50 rounded-xl hover:border-border hover:shadow-md transition-all duration-200"
                            >
                                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4 text-foreground">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it works */}
            <section className="px-6 py-16 border-t border-border/50">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-center mb-12">
                        Build an MCP server in minutes
                    </h2>
                    <div className="space-y-6">
                        {steps.map((item) => (
                            <div key={item.step} className="flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                                    {item.step}
                                </div>
                                <div className="pt-1.5">
                                    <h3 className="font-semibold">{item.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="px-6 py-20 border-t border-border/50">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                        Ready to build?
                    </h2>
                    <p className="mt-4 text-muted-foreground">
                        Start creating MCP servers and skills for your AI tools today.
                    </p>
                    <div className="mt-8">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 h-12 px-8 bg-primary text-primary-foreground rounded-full text-base font-medium hover:brightness-110 transition-all duration-150 active:scale-[0.98] shadow-sm"
                        >
                            Go to dashboard
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                                <path d="M6.5 3.5L11 8L6.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}
