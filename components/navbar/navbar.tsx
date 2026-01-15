import Link from "next/link";
import NavbarClient from "./navbar-client";

export default function Navbar() {
    return (
        <nav className="flex justify-between items-center h-14 px-6 border-b">
            <Link href="/" className="text-sm font-semibold tracking-tight">
                Toolkit
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