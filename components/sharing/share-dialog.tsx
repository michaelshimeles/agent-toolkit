"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Share2, Globe, Users, User, X, Check, Copy } from "lucide-react";
import { generateShareLink } from "@/lib/collaboration-utils";

interface ShareDialogProps {
  serverId: string;
}

export function ShareDialog({ serverId }: ShareDialogProps) {
  const { user, isLoaded } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [shareType, setShareType] = useState<"public" | "user" | "workspace">("user");
  const [userEmail, setUserEmail] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [permission, setPermission] = useState<"view" | "edit" | "admin">("view");
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(undefined);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Get Convex user
  const convexUser = useQuery(
    api.auth.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  // Ensure user exists in Convex
  const ensureUser = useMutation(api.auth.ensureUser);

  useEffect(() => {
    if (isLoaded && user && convexUser === null) {
      ensureUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [isLoaded, user, convexUser, ensureUser]);

  const shares = useQuery(
    api.sharing.listServerShares,
    serverId ? { serverId: serverId as any } : "skip"
  );

  const workspaces = useQuery(
    api.workspaces.listUserWorkspaces,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const shareWithUser = useMutation(api.sharing.shareWithUser);
  const shareWithWorkspace = useMutation(api.sharing.shareWithWorkspace);
  const makePublic = useMutation(api.sharing.makePublic);
  const removeShare = useMutation(api.sharing.removeShare);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:mount',message:'ShareDialog mounted/updated',data:{serverId,isLoaded,hasUser:!!user,convexUser:convexUser?._id||null,workspacesCount:workspaces?.length,sharesCount:shares?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
  }, [serverId, isLoaded, user, convexUser, workspaces, shares]);
  // #endregion

  // #region agent log
  const handleOpenChange = (open: boolean) => {
    const stack = new Error().stack;
    fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleOpenChange',message:'Dialog open state changing',data:{from:isOpen,to:open,stack:stack?.split('\n').slice(1,5).join(' | ')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    setIsOpen(open);
  };
  // #endregion

  const handleShare = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleShare:entry',message:'handleShare called',data:{convexUserId:convexUser?._id||null,shareType,selectedWorkspace,permission,userEmail},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    if (!convexUser) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleShare:early-return',message:'Early return - convexUser is null',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    try {
      let shareId;
      const expiresAt = expiresInDays
        ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000
        : undefined;

      if (shareType === "public") {
        shareId = await makePublic({
          serverId: serverId as any,
          permission: permission === "admin" ? "edit" : permission,
          sharedBy: convexUser._id,
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleShare:public',message:'makePublic completed',data:{shareId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else if (shareType === "workspace" && selectedWorkspace) {
        shareId = await shareWithWorkspace({
          serverId: serverId as any,
          workspaceId: selectedWorkspace as any,
          permission,
          sharedBy: convexUser._id,
        });
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleShare:workspace',message:'shareWithWorkspace completed',data:{shareId,workspaceId:selectedWorkspace},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      } else if (shareType === "user" && userEmail) {
        // In a real app, you'd look up the user by email first
        // For now, we'll skip this as it requires user lookup logic
        alert("User sharing requires looking up user by email - not implemented in this demo");
        return;
      }

      if (shareType === "public" && shareId) {
        const link = generateShareLink(serverId, shareId);
        setShareLink(window.location.origin + link);
      }

      // Reset form
      setUserEmail("");
      setSelectedWorkspace("");
      setPermission("view");
      setExpiresInDays(undefined);
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:handleShare:error',message:'Share mutation failed',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      console.error("Failed to share:", error);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await removeShare({ shareId: shareId as any });
    } catch (error) {
      console.error("Failed to remove share:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share Server</DialogTitle>
          <DialogDescription>
            Share this server with others or make it public
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share Type Selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={shareType === "user" ? "default" : "outline"}
                onClick={() => setShareType("user")}
                className="h-auto py-3"
              >
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm">User</span>
              </Button>
              <Button
                type="button"
                variant={shareType === "workspace" ? "default" : "outline"}
                onClick={() => setShareType("workspace")}
                className="h-auto py-3"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="text-sm">Workspace</span>
              </Button>
              <Button
                type="button"
                variant={shareType === "public" ? "default" : "outline"}
                onClick={() => setShareType("public")}
                className="h-auto py-3"
              >
                <Globe className="h-4 w-4 mr-2" />
                <span className="text-sm">Public</span>
              </Button>
            </div>

            {/* Share with User */}
            {shareType === "user" && (
              <div className="space-y-2">
                <Label>User Email</Label>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
            )}

            {/* Share with Workspace */}
            {shareType === "workspace" && (
              <div className="space-y-2">
                <Label>Workspace</Label>
                <Select value={selectedWorkspace} onValueChange={(v) => {
                  // #region agent log
                  fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:workspace-select',message:'Workspace select changed',data:{newValue:v,oldValue:selectedWorkspace,availableWorkspaces:workspaces?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
                  // #endregion
                  setSelectedWorkspace(v);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces?.map((workspace) => (
                      <SelectItem key={workspace._id} value={workspace._id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Permission Level */}
            <div className="space-y-2">
              <Label>Permission Level</Label>
              <Select value={permission} onValueChange={(v: any) => {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/951a582d-7d5c-416d-96f8-66f5dcc70ccb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'share-dialog.tsx:permission-select',message:'Permission select changed',data:{newValue:v,oldValue:permission},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
                // #endregion
                setPermission(v);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Can Edit</SelectItem>
                  {shareType !== "public" && (
                    <SelectItem value="admin">Full Access</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Expiration (optional, for user shares) */}
            {shareType === "user" && (
              <div className="space-y-2">
                <Label>Expires in (Optional)</Label>
                <Select
                  value={expiresInDays?.toString() || "never"}
                  onValueChange={(v) =>
                    setExpiresInDays(v === "never" ? undefined : parseInt(v))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleShare} className="w-full">
              Share
            </Button>

            {/* Share Link (for public shares) */}
            {shareLink && (
              <div className="space-y-2 p-4 bg-muted rounded-lg">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly />
                  <Button variant="outline" onClick={handleCopyLink}>
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Current Shares */}
          {shares && shares.length > 0 && (
            <div className="space-y-2">
              <Label>Current Shares</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {shares.map((share) => (
                  <div
                    key={share._id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      {share.sharedWith === "public" && (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      {share.sharedWith === "workspace" && (
                        <Users className="h-4 w-4 text-muted-foreground" />
                      )}
                      {share.sharedWith === "user" && (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="text-sm">
                        <div className="font-medium">
                          {share.sharedWith === "public"
                            ? "Public Link"
                            : share.details?.name || share.sharedWith}
                        </div>
                        <div className="text-muted-foreground capitalize">
                          {share.permission}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveShare(share._id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
