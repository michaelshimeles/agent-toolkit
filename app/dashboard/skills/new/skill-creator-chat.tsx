"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { type UIMessage, DefaultChatTransport } from "ai";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SkillArtifactPreview,
  SkillArtifact,
} from "@/components/skills/skill-artifact-preview";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import { matchSkillToTemplates, getTemplateById, TemplateMatch } from "@/lib/template-matcher";

interface SkillCreatorChatProps {
  clerkId: string;
  onSave: (artifact: SkillArtifact) => Promise<void>;
}

/**
 * Try to fix and parse incomplete JSON during streaming
 */
function tryParsePartialJson(jsonStr: string): SkillArtifact | null {
  if (!jsonStr || !jsonStr.trim().startsWith("{")) return null;

  try {
    // First try parsing as-is
    return JSON.parse(jsonStr) as SkillArtifact;
  } catch {
    // Try to fix incomplete JSON
    let fixedJson = jsonStr.trim();

    // Remove trailing incomplete string (e.g., `"skillMd": "some content...` without closing quote)
    // Look for unclosed string at the end
    const lastQuoteIndex = fixedJson.lastIndexOf('"');
    if (lastQuoteIndex > 0) {
      const afterLastQuote = fixedJson.slice(lastQuoteIndex + 1);
      // If there's content after the last quote that's not a valid JSON continuation
      if (afterLastQuote && !/^[\s,}\]:]/.test(afterLastQuote)) {
        // The string is incomplete, close it
        fixedJson = fixedJson + '"';
      }
    }

    // Count open brackets and braces
    const openBraces =
      (fixedJson.match(/{/g) || []).length -
      (fixedJson.match(/}/g) || []).length;
    const openBrackets =
      (fixedJson.match(/\[/g) || []).length -
      (fixedJson.match(/]/g) || []).length;

    // Close open brackets first, then braces
    for (let i = 0; i < openBrackets; i++) {
      fixedJson += "]";
    }
    for (let i = 0; i < openBraces; i++) {
      fixedJson += "}";
    }

    try {
      return JSON.parse(fixedJson) as SkillArtifact;
    } catch {
      return null;
    }
  }
}

/**
 * Parse skill artifact from message content
 * Looks for <skill-artifact>...</skill-artifact> markers and extracts JSON
 * Also handles partial artifacts during streaming
 */
function parseSkillArtifact(content: string): SkillArtifact | null {
  // First try to match complete artifacts
  const completeMatch = content.match(
    /<skill-artifact>([\s\S]*?)<\/skill-artifact>/
  );
  if (completeMatch) {
    const result = tryParsePartialJson(completeMatch[1].trim());
    if (result) return result;
  }

  // Try to match partial artifacts (during streaming, no closing tag yet)
  const partialMatch = content.match(/<skill-artifact>([\s\S]*)$/);
  if (partialMatch) {
    return tryParsePartialJson(partialMatch[1].trim());
  }

  return null;
}

/**
 * Extract the latest artifact from all messages
 */
function getLatestArtifact(messages: UIMessage[]): SkillArtifact | null {
  // Search from most recent message to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === "assistant") {
      // Get text content from message parts
      const textContent = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      const artifact = parseSkillArtifact(textContent);
      if (artifact) return artifact;
    }
  }
  return null;
}

/**
 * Remove artifact markers from message content for display
 * Handles both complete artifacts and partial ones during streaming
 */
function cleanMessageContent(content: string): string {
  // First, remove complete artifacts
  let cleaned = content.replace(/<skill-artifact>[\s\S]*?<\/skill-artifact>/g, "");

  // Then, remove partial artifacts that haven't closed yet (during streaming)
  // This handles the case where we have <skill-artifact> but no closing tag yet
  cleaned = cleaned.replace(/<skill-artifact>[\s\S]*$/g, "");

  return cleaned.trim();
}

/**
 * Message bubble component for chat display
 */
function MessageBubble({
  message,
  isUser,
  userInitial,
}: {
  message: UIMessage;
  isUser: boolean;
  userInitial: string;
}) {
  // Get text content from message parts
  const textContent = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

  const displayContent = cleanMessageContent(textContent);

  // Check if this message contains an artifact
  const hasArtifact = textContent.includes("<skill-artifact>");

  if (!displayContent && !hasArtifact) return null;

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
          )}
        >
          {isUser ? (
            userInitial
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8V4H8" />
              <rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" />
              <path d="M20 14h2" />
              <path d="M15 13v2" />
              <path d="M9 13v2" />
            </svg>
          )}
        </AvatarFallback>
      </Avatar>

      {/* Message content */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted border border-border/50"
        )}
      >
        {displayContent && (
          <div
            className={cn(
              "text-sm leading-relaxed prose prose-sm max-w-none",
              isUser
                ? "prose-invert"
                : "prose-neutral dark:prose-invert"
            )}
          >
            {isUser ? (
              <p className="m-0">{displayContent}</p>
            ) : (
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="m-0 mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="m-0 mb-2 last:mb-0 pl-4">{children}</ul>,
                  ol: ({ children }) => <ol className="m-0 mb-2 last:mb-0 pl-4">{children}</ol>,
                  li: ({ children }) => <li className="m-0">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-background/50 px-1 py-0.5 rounded text-xs">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-background/50 p-2 rounded overflow-auto text-xs my-2">
                      {children}
                    </pre>
                  ),
                }}
              >
                {displayContent}
              </ReactMarkdown>
            )}
          </div>
        )}
        {hasArtifact && !displayContent && (
          <p className="text-sm text-muted-foreground italic">
            Generated skill artifact
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Typing indicator component
 */
function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[85%]">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </AvatarFallback>
      </Avatar>
      <div className="bg-muted border border-border/50 rounded-2xl px-4 py-3">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

export default function SkillCreatorChat({
  clerkId,
  onSave,
}: SkillCreatorChatProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [templateSuggestions, setTemplateSuggestions] = useState<TemplateMatch[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [hasCheckedTemplates, setHasCheckedTemplates] = useState(false);

  // Get user initial for avatar
  const userInitial = clerkId.charAt(0).toUpperCase();

  // Memoize the transport to avoid recreating on each render
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/skill-chat",
      }),
    []
  );

  // Use AI SDK's useChat hook with the new v6 API
  const {
    messages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    transport,
  });

  // Derive loading state from status
  const isLoading = status === "submitted" || status === "streaming";

  // Extract the latest artifact from messages
  const currentArtifact = useMemo(
    () => getLatestArtifact(messages),
    [messages]
  );

  // Auto-scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Check for template matches after first user message
  useEffect(() => {
    if (!hasCheckedTemplates && messages.length === 1 && messages[0].role === "user") {
      const userMessage = messages[0].parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      const matches = matchSkillToTemplates(userMessage);
      const highConfidenceMatches = matches.filter((m) => m.confidence > 0.5);

      if (highConfidenceMatches.length > 0) {
        setTemplateSuggestions(highConfidenceMatches);
      }
      setHasCheckedTemplates(true);
    }
  }, [messages, hasCheckedTemplates]);

  // Handle template selection
  const handleUseTemplate = useCallback((templateId: string) => {
    const template = getTemplateById(templateId);
    if (!template) return;

    setSelectedTemplate(templateId);
    setTemplateSuggestions([]);

    // Build a context message with the template content
    const templateContext = `I'd like to use the "${template.name}" template as a starting point. Here's the template content:

---
${template.skillMd}
---

${template.scripts && template.scripts.length > 0 ? `
The template includes these helper scripts:
${template.scripts.map((s) => `- ${s.name} (${s.language})`).join("\n")}
` : ""}

${template.references && template.references.length > 0 ? `
The template includes these reference documents:
${template.references.map((r) => `- ${r.name}`).join("\n")}
` : ""}

Please help me customize this template for my specific needs.`;

    // Send the template context as a new message
    sendMessage({ text: templateContext });
  }, [sendMessage]);

  // Dismiss template suggestions
  const handleDismissSuggestions = useCallback(() => {
    setTemplateSuggestions([]);
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input.trim();
    setInput("");

    try {
      await sendMessage({ text: message });
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  // Handle save
  const handleSave = async () => {
    if (!currentArtifact) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(currentArtifact);
    } catch (err) {
      console.error("Failed to save skill:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save skill. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left side - Chat interface (60%) */}
      <div className="w-[60%] flex flex-col border rounded-xl bg-card">
        {/* Chat header */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 8V4H8" />
                <rect width="16" height="12" x="4" y="8" rx="2" />
                <path d="M2 14h2" />
                <path d="M20 14h2" />
                <path d="M15 13v2" />
                <path d="M9 13v2" />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Skill Creator Assistant</h2>
              <p className="text-xs text-muted-foreground">
                Describe your skill and I will help you create it
              </p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-600/10 border border-violet-500/20 flex items-center justify-center mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-violet-500"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="M8 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M16 10h.01" />
                </svg>
              </div>
              <h3 className="font-semibold text-lg mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Tell me about the skill you want to create. I will ask clarifying
                questions and generate a complete skill for Claude Code.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  "Create a code review skill",
                  "Help me build a testing assistant",
                  "I need a documentation generator",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="text-left px-4 py-2.5 text-sm border rounded-lg hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Template Suggestions Banner */}
          {templateSuggestions.length > 0 && (
            <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-violet-600 dark:text-violet-400 mb-1">
                    Template suggestion
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    This sounds like a <span className="font-medium">{templateSuggestions[0].templateName}</span> skill.
                    Would you like to start from a template?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseTemplate(templateSuggestions[0].templateId)}
                      className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors"
                    >
                      Use Template
                    </button>
                    <button
                      onClick={handleDismissSuggestions}
                      className="px-3 py-1.5 text-xs border border-violet-500/30 rounded-md hover:bg-violet-500/10 transition-colors"
                    >
                      Continue without
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleDismissSuggestions}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isUser={message.role === "user"}
              userInitial={userInitial}
            />
          ))}

          {isLoading && <TypingIndicator />}

          {/* Error display */}
          {(chatError || error) && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                {chatError?.message || error}
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="px-4 py-3 border-t">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe your skill..."
                disabled={isLoading}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-xl border bg-background px-4 py-2.5 pr-12 text-sm",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "min-h-[44px] max-h-[200px]"
                )}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 bottom-2 h-8 w-8 rounded-lg"
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                )}
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground mt-1.5 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Right side - Artifact preview (40%) */}
      <div className="w-[40%] h-full">
        <SkillArtifactPreview
          artifact={currentArtifact || {}}
          isStreaming={isLoading}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>
    </div>
  );
}
