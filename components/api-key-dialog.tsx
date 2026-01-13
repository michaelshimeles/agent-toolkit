"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Key, Shield } from "lucide-react";

interface ApiKeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users">;
  serverId: Id<"generatedServers">;
  serviceName: string;
  serviceUrl?: string;
  instructions?: string;
  onSuccess?: () => void;
}

export function ApiKeyDialog({
  isOpen,
  onClose,
  userId,
  serverId,
  serviceName,
  serviceUrl,
  instructions,
  onSuccess,
}: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [keyName, setKeyName] = useState(`${serviceName} API Key`);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user already has a key for this service
  const existingKey = useQuery(
    api.builder.getExternalApiKey,
    userId && serviceName ? { userId, serviceName } : "skip"
  );

  const storeKey = useMutation(api.builder.storeExternalApiKey);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setError("API key is required");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await storeKey({
        userId,
        serverId,
        serviceName,
        serviceKey: apiKey.trim(),
        keyName: keyName.trim() || `${serviceName} API Key`,
      });

      setApiKey("");
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-5" />
            {serviceName} API Key Required
          </DialogTitle>
          <DialogDescription>
            This MCP server requires an API key from {serviceName} to function properly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {instructions && (
            <Alert>
              <Shield className="size-4" />
              <AlertDescription>
                <div className="whitespace-pre-line text-sm">{instructions}</div>
              </AlertDescription>
            </Alert>
          )}

          {serviceUrl && (
            <div className="text-sm">
              <Label className="text-sm font-medium">Get your API key:</Label>
              <a
                href={serviceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-primary hover:underline mt-1"
              >
                <ExternalLink className="size-3" />
                {serviceUrl}
              </a>
            </div>
          )}

          {existingKey && (
            <Alert>
              <AlertDescription>
                You already have a {serviceName} API key stored. You can update it here or use the existing one.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="keyName">Key Name (optional)</Label>
            <Input
              id="keyName"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., OpenWeatherMap Production Key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="font-mono"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleSaveKey} disabled={isSaving || !apiKey.trim()}>
            {isSaving ? "Saving..." : "Save API Key"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}