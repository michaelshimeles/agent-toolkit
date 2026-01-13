import { Button } from "@/components/ui/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";

export default async function Page() {
    return (
        <main className="flex flex-col items-center justify-center min-h-[80vh] p-12 max-w-2xl mx-auto text-center">
            <h1 className="text-3xl font-medium tracking-tight">MCP Hub</h1>
            <p className="text-muted-foreground mt-3 text-lg">
                Connect your AI agents to all your tools through a single MCP endpoint.
            </p>

            <div className="mt-8 flex items-center gap-3">
                <Link href="/dashboard" prefetch={true}>
                    <Button size="lg">
                        Get Started
                        <ArrowRightIcon className="ml-1 h-4 w-4" />
                    </Button>
                </Link>
            </div>

            <div className="mt-16 flex flex-col gap-4 text-sm text-muted-foreground">
                <p>10+ integrations including GitHub, Slack, Linear, and Stripe</p>
                <p>Generate custom MCP servers with AI</p>
                <p>Secure OAuth management and API keys</p>
            </div>

            <footer className="absolute bottom-8 left-0 right-0">
                <div className="flex items-center justify-center gap-6">
                    <Link href="/api/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        API Docs
                    </Link>
                    <Link href="https://github.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        GitHub
                    </Link>
                </div>
            </footer>
        </main>
    )
}
