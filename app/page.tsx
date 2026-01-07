import { Button } from "@/components/ui/button";
import { ZapIcon, ShieldIcon, CodeIcon, ArrowRightIcon, WrenchIcon, LinkIcon, DatabaseIcon, MessageSquareIcon, MailIcon, LayoutIcon, CreditCardIcon, SparklesIcon, KeyIcon, BarChartIcon } from "lucide-react";
import Link from "next/link";

export default async function Page() {

    return (
        <main className="flex flex-col items-start min-h-screen p-12">
            <h1 className="text-lg font-medium">MCP Hub</h1>
            <p className="text-sm text-muted-foreground mt-1">
                The unified integration layer for AI agents. Connect once, access everything.
            </p>
            <div className="mt-2 flex items-center gap-2">
                <Link href="/dashboard" prefetch={true}>
                    <Button>
                        <ZapIcon />
                        Open Dashboard
                    </Button>
                </Link>
                <Link href="/dashboard/builder" prefetch={true}>
                    <Button variant="outline">
                        <SparklesIcon />
                        AI Builder
                    </Button>
                </Link>
            </div>

            <div className="mt-12 w-full">
                <h2 className="text-lg font-medium">Why MCP Hub?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect your AI agents to multiple services through a single, unified MCP endpoint.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <LinkIcon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-medium mt-2">Unified Gateway</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            One MCP endpoint that routes to all your integrations automatically.
                        </p>
                    </div>
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <SparklesIcon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-medium mt-2">AI-Powered Builder</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Generate custom MCP servers from API docs, OpenAPI specs, or cURL commands.
                        </p>
                    </div>
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <ShieldIcon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-sm font-medium mt-2">Secure by Default</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            OAuth tokens encrypted at rest, API key authentication, security scanning.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-12 w-full">
                <h2 className="text-lg font-medium">Built-in Integrations</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    10 production-ready integrations with 98 tools ready to use.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <CodeIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">GitHub</h3>
                                <span className="text-xs text-muted-foreground">8 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create issues, PRs, search code, manage repositories.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <LayoutIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Linear</h3>
                                <span className="text-xs text-muted-foreground">7 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create and update issues, manage teams and projects.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <MessageSquareIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Slack</h3>
                                <span className="text-xs text-muted-foreground">10 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Send messages, manage channels, search conversations.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <DatabaseIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">PostgreSQL</h3>
                                <span className="text-xs text-muted-foreground">8 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Execute queries, inspect schemas, monitor databases.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <MailIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Gmail</h3>
                                <span className="text-xs text-muted-foreground">12 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Send, search, and manage emails and drafts.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                        <div className="flex items-center justify-center h-10 w-10 rounded-md bg-muted">
                            <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-medium">Stripe</h3>
                                <span className="text-xs text-muted-foreground">12 tools</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Manage customers, invoices, subscriptions, and payments.
                            </p>
                        </div>
                    </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                    Plus: Notion, Google Drive, Jira, and Airtable integrations.
                </p>
                <div className="mt-4">
                    <Link href="/dashboard/integrations">
                        <Button variant="outline">
                            View All Integrations
                            <ArrowRightIcon />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="mt-12 w-full">
                <h2 className="text-lg font-medium">How It Works</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Get up and running in three simple steps.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">01</span>
                        <h3 className="text-sm font-medium mt-2">Enable Integrations</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Connect your accounts via OAuth and enable the integrations you need.
                        </p>
                    </div>
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">02</span>
                        <h3 className="text-sm font-medium mt-2">Get Your API Key</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Create an API key in the dashboard to authenticate your AI agent.
                        </p>
                    </div>
                    <div className="flex flex-col items-start p-4 border rounded-lg">
                        <span className="text-sm font-medium text-muted-foreground">03</span>
                        <h3 className="text-sm font-medium mt-2">Connect Claude Desktop</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Add @mcphub/client to your config and all tools become available.
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-12 w-full">
                <h2 className="text-lg font-medium">Dashboard Features</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Everything you need to manage your AI integrations.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <KeyIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium">API Key Management</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create, rotate, and revoke API keys for secure access.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <BarChartIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium">Usage Analytics</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Track requests, errors, and latency per integration.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <SparklesIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium">AI Server Builder</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Generate custom MCP servers with Claude and deploy to Vercel.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border rounded-lg">
                        <WrenchIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <h3 className="text-sm font-medium">Activity Logs</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Debug tool calls with detailed request and response logs.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Link href="/dashboard">
                        <Button>
                            Open Dashboard
                            <ArrowRightIcon />
                        </Button>
                    </Link>
                    <Link href="/dashboard/builder">
                        <Button variant="outline">
                            Try AI Builder
                        </Button>
                    </Link>
                </div>
            </div>

            <footer className="mt-12 w-full pt-8 border-t">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        MCP Hub
                    </p>
                    <div className="flex items-center gap-4">
                        <Link href="/api/docs" className="text-sm text-muted-foreground hover:underline">
                            API Docs
                        </Link>
                        <Link href="#" className="text-sm text-muted-foreground hover:underline">
                            GitHub
                        </Link>
                    </div>
                </div>
            </footer>
        </main>
    )
}
