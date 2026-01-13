"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Globe,
  Lock,
  Eye,
  Edit,
  Shield,
  User,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";
import { useState } from "react";
import { formatPermissionName } from "@/lib/collaboration-utils";

export default function SharedServerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const [copied, setCopied] = useState(false);

  const serverId = params.serverId as string;
  const shareId = searchParams.get("share");

  // Get shared server data
  const sharedData = useQuery(
    api.sharing.getSharedServer,
    serverId && shareId ? { serverId: serverId as any, shareId: shareId as any } : "skip"
  );

  const handleCopyCode = () => {
    if (sharedData?.server.code) {
      navigator.clipboard.writeText(sharedData.server.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!shareId || !serverId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Invalid Share Link</h1>
          <p className="text-muted-foreground mb-6">
            This share link is invalid or incomplete.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  if (sharedData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading shared server...</p>
        </div>
      </div>
    );
  }

  if (sharedData === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Share Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This server share doesn't exist, has been removed, or has expired.
          </p>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const { server, share, owner } = sharedData;
  const permissionIcon = share.permission === "view" ? Eye : share.permission === "edit" ? Edit : Shield;
  const PermissionIcon = permissionIcon;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <a
                href="/dashboard"
                className="text-primary hover:text-primary/80 inline-flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </a>
            </div>
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Viewing as:
                </span>
                <Avatar className="h-8 w-8">
                  <img src={user.imageUrl} alt={user.fullName || "User"} />
                </Avatar>
              </div>
            )}
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              {share.sharedWith === "public" ? (
                <Globe className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <Badge variant="outline">
                <PermissionIcon className="h-3 w-3 mr-1" />
                {formatPermissionName(share.permission)}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {server.description}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Server Info */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Server Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge
                      variant={
                        server.status === "deployed"
                          ? "default"
                          : server.status === "failed"
                          ? "destructive"
                          : "outline"
                      }
                    >
                      {server.status}
                    </Badge>
                  </div>
                </div>

                {server.deploymentUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Deployment URL
                    </label>
                    <div className="mt-1">
                      <a
                        href={server.deploymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        {server.deploymentUrl}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Source Type
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">{server.sourceType}</Badge>
                  </div>
                </div>

                {server.sourceUrl && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Source URL
                    </label>
                    <div className="mt-1">
                      <a
                        href={server.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        {server.sourceUrl}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tools */}
            {server.tools && server.tools.length > 0 && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Available Tools</h2>
                <div className="space-y-3">
                  {server.tools.map((tool, idx) => (
                    <div key={idx} className="border-l-2 border-primary pl-4 py-2">
                      <h3 className="font-medium">{tool.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Code - Only if user has edit permission */}
            {share.permission !== "view" && (
              <div className="bg-card rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Server Code</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto text-sm">
                  <code>{server.code}</code>
                </pre>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Info */}
            <div className="bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Share Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Shared By
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    {owner?.imageUrl && (
                      <Avatar className="h-6 w-6">
                        <img src={owner.imageUrl} alt={owner.name || "Owner"} />
                      </Avatar>
                    )}
                    <span className="text-sm">
                      {owner?.name || owner?.email || "Unknown"}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Access Level
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">
                      <PermissionIcon className="h-3 w-3 mr-1" />
                      {formatPermissionName(share.permission)}
                    </Badge>
                  </div>
                </div>

                {share.expiresAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Expires
                    </label>
                    <div className="mt-1 text-sm">
                      {new Date(share.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documentation */}
            {server.readme && (
              <div className="bg-card rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Documentation</h2>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{server.readme}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
