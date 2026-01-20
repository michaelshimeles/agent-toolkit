"use client"
import { ClerkLoaded, ClerkLoading, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "../ui/button";

export default function NavbarClient() {
    return (
        <div className="flex items-center gap-2">
            <ClerkLoading>
                {/* Skeleton while Clerk loads */}
                <div className="w-24 h-9 bg-muted rounded-md animate-pulse" />
                <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
            </ClerkLoading>

            <ClerkLoaded>
                <SignedOut>
                    <Button variant="outline">
                        <Link href="/sign-in">
                            Sign In
                        </Link>
                    </Button>
                </SignedOut>
                <SignedIn>
                    <Button variant="ghost">
                        <Link href="/dashboard">
                            Dashboard
                        </Link>
                    </Button>
                    <UserButton afterSignOutUrl="/" />
                </SignedIn>
            </ClerkLoaded>
        </div>
    )
}