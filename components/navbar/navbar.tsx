import Link from "next/link";
import NavbarClient from "./navbar-client";

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center py-4 px-12 border-b h-14">
            <Link href="/">
                <h1>MCP</h1>
            </Link>
            <NavbarClient />
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