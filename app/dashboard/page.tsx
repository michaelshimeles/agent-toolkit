import Link from "next/link";
import { DeployedServers } from "./deployed-servers";

export default function Dashboard() {
    const dashboardLinks = [
        {
            title: "AI Builder",
            description: "Generate MCP servers from APIs, docs, or GitHub repos",
            href: "/dashboard/builder",
            icon: "🤖",
        },
        {
            title: "Integrations",
            description: "Connect and manage your integrations",
            href: "/dashboard/integrations",
            icon: "🔌",
        },
        {
            title: "API Keys",
            description: "Create and manage your API keys",
            href: "/dashboard/api-keys",
            icon: "🔑",
        },
        {
            title: "Usage",
            description: "View your usage analytics and logs",
            href: "/dashboard/usage",
            icon: "📊",
        },
    ];

    return (
        <main className="flex flex-col items-start min-h-screen p-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-2">
                    Manage your MCP Hub integrations, API keys, and usage.
                </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-10">
                {dashboardLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="p-5 border rounded-lg hover:shadow-lg transition-all hover:border-primary/50 group"
                    >
                        <div className="text-3xl mb-3">{link.icon}</div>
                        <h2 className="text-base font-semibold mb-1 group-hover:text-primary transition-colors">{link.title}</h2>
                        <p className="text-xs text-muted-foreground">
                            {link.description}
                        </p>
                    </Link>
                ))}
            </div>

            {/* Deployed Servers Section */}
            <DeployedServers />
        </main>
    );
}
