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
            title: "Settings",
            description: "Configure your Anthropic API key",
            href: "/dashboard/settings",
        },
    ];

    return (
        <main className="min-h-screen px-6 py-10 md:py-14">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-14">
                    <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
                    <p className="text-base text-muted-foreground mt-2">
                        Build and manage your tools
                    </p>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-20">
                    {dashboardLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group p-5 bg-card border border-border/50 rounded-xl hover:border-border hover:shadow-md transition-all duration-200"
                        >
                            <h2 className="text-base font-semibold mb-1.5 tracking-tight">{link.title}</h2>
                            <p className="text-sm text-muted-foreground">
                                {link.description}
                            </p>
                        </Link>
                    ))}
                </div>

                {/* Deployed Content */}
                <div className="space-y-20">
                    <DeployedServers />
                    <DeployedSkills />
                </div>
            </div>
        </main>
    );
}
