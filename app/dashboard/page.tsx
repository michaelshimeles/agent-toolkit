import Link from "next/link";
import { DeployedServers } from "./deployed-servers";
import { DeployedSkills } from "./deployed-skills";

export default function Dashboard() {
    const dashboardLinks = [
        {
            title: "MCP",
            description: "Build and deploy MCP servers",
            href: "/dashboard/builder",
        },
        {
            title: "Skills",
            description: "Create agent skills for Claude Code",
            href: "/dashboard/skills",
        },
        {
            title: "API Keys",
            description: "Manage your API keys",
            href: "/dashboard/api-keys",
        },
        {
            title: "Usage",
            description: "View analytics and logs",
            href: "/dashboard/usage",
        },
    ];

    return (
        <main className="min-h-screen px-6 py-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Build and manage your tools
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                    {dashboardLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group p-4 border rounded-lg hover:border-foreground/20 transition-colors"
                        >
                            <h2 className="text-sm font-medium mb-1">{link.title}</h2>
                            <p className="text-xs text-muted-foreground">
                                {link.description}
                            </p>
                        </Link>
                    ))}
                </div>

                {/* Deployed Content */}
                <div className="space-y-16">
                    <DeployedServers />
                    <DeployedSkills />
                </div>
            </div>
        </main>
    );
}
