import Link from "next/link";
import NavbarClient from "./navbar-client";

import { Github } from "lucide-react";

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center h-16 px-6 border-b border-border/50">
            <Link href="/" className="text-base font-semibold tracking-tight hover:opacity-80 transition-opacity">
                Toolkit
            </Link>
            <div className="flex items-center gap-4">
                <a
                    href="https://github.com/michaelshimeles/agent-toolkit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                >
                    <Github className="h-5 w-5" />
                </a>
                <NavbarClient />
            </div>
        </nav>
    )
}

const NavbarSkeleton = () => {
    return (
        <div className="flex items-center gap-2">
            {/* Dashboard button skeleton */}
            <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
            {/* Avatar skeleton */}
            <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
        </div>
    )
}