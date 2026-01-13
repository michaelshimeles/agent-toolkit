"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

interface Tool {
  name: string;
  description: string;
  schema: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface MCPTestConsoleProps {
  serverId: string;
  serverName: string;
  deploymentUrl: string;
  tools: Tool[];
}

export function MCPTestConsole({
  serverName,
  deploymentUrl,
  tools,
}: MCPTestConsoleProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [hasExistingKeys, setHasExistingKeys] = useState<boolean | null>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isApiKeySet, setIsApiKeySet] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    status,
    error,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/mcp-chat",
      body: {
        apiKey,
        deploymentUrl,
      },
    }),
  });

  const isLoading = status === "streaming" || status === "submitted";

  // Check if user has any API keys created
  useEffect(() => {
    fetch("/api/keys")
      .then((res) => res.json())
      .then((data) => {
        setHasExistingKeys(data.keys && data.keys.length > 0);
      })
      .catch(() => {
        setHasExistingKeys(false);
      })
      .finally(() => {
        setIsLoadingKeys(false);
      });
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      setIsApiKeySet(true);
      // Add initial welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          parts: [
            {
              type: "text",
              text: `Hi! I'm ready to help you test **${serverName}**.\n\nI have access to ${tools.length} tool${tools.length !== 1 ? "s" : ""}:\n${tools.map((t) => `- **${t.name}**: ${t.description}`).join("\n")}\n\nWhat would you like me to help you with?`,
            },
          ],
        },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      sendMessage({ text: inputValue });
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `Chat cleared! I'm still connected to **${serverName}** with ${tools.length} available tool${tools.length !== 1 ? "s" : ""}.\n\nWhat would you like to do?`,
          },
        ],
      },
    ]);
  };

  // Helper to extract text from message parts
  const getMessageText = (message: typeof messages[0]) => {
    return message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("");
  };

  // Helper to get tool invocations from message parts
  type ToolPartInfo = { type: string; toolCallId?: string; toolName?: string; state?: string; input?: unknown; output?: unknown };
  
  const getToolParts = (message: typeof messages[0]): ToolPartInfo[] => {
    return message.parts
      .filter((part) => part.type.startsWith("tool-") || part.type === "dynamic-tool")
      .map((part) => part as unknown as ToolPartInfo);
  };

  // API Key setup screen
  if (!isApiKeySet) {
    return (
      <div className="bg-card rounded-lg border">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Test Console
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chat with AI to test your MCP server tools
          </p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">API Key</label>
            {isLoadingKeys ? (
              <div className="flex items-center gap-2 px-3 py-2 border bg-muted rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm text-muted-foreground">Checking API keys...</span>
              </div>
            ) : (
              <>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetApiKey()}
                  placeholder="Paste your API key here..."
                  className="w-full px-3 py-2 border border-input bg-background rounded-lg text-sm font-mono"
                />
                {hasExistingKeys ? (
                  <p className="text-xs text-muted-foreground">
                    Paste your API key to start chatting.{" "}
                    <a
                      href="/dashboard/api-keys"
                      className="text-primary hover:underline"
                    >
                      Manage keys
                    </a>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No API keys found.{" "}
                    <a
                      href="/dashboard/api-keys"
                      className="text-primary hover:underline"
                    >
                      Create one
                    </a>{" "}
                    to test your server.
                  </p>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleSetApiKey}
            disabled={!apiKey.trim() || isLoadingKeys}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
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
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Start Chat Session
          </button>

          {/* Available tools preview */}
          {tools.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available Tools ({tools.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {tools.slice(0, 6).map((tool) => (
                  <span
                    key={tool.name}
                    className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded border font-mono"
                  >
                    {tool.name}
                  </span>
                ))}
                {tools.length > 6 && (
                  <span className="px-2 py-1 text-xs text-muted-foreground">
                    +{tools.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="bg-card rounded-lg border overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <div>
            <h3 className="font-semibold text-sm">{serverName}</h3>
            <p className="text-xs text-muted-foreground">
              {tools.length} tool{tools.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Clear chat"
          >
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={() => setIsApiKeySet(false)}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Change API key"
          >
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
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {message.role === "assistant" ? (
                <div className="markdown-docs text-sm">
                  <ReactMarkdown>{getMessageText(message)}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{getMessageText(message)}</p>
              )}

              {/* Tool invocations */}
              {getToolParts(message).length > 0 && (
                <div className="mt-3 space-y-2">
                  {getToolParts(message).map((part, idx) => (
                    <div
                      key={idx}
                      className="bg-background border rounded-lg overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-muted border-b flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${part.state === "output-available" ? "bg-green-500" : "bg-primary animate-pulse"}`} />
                        <span className="text-xs font-mono text-muted-foreground">
                          {part.toolName || part.type.replace("tool-", "")}
                        </span>
                        {part.state === "output-available" && (
                          <span className="ml-auto text-xs text-green-600">✓</span>
                        )}
                      </div>
                      {part.state === "output-available" && part.output && (
                        <pre className="p-3 text-xs overflow-x-auto font-mono text-muted-foreground max-h-48 overflow-y-auto">
                          {JSON.stringify(part.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg px-4 py-3 text-sm">
              <p className="font-medium">Error</p>
              <p className="text-xs mt-1 opacity-80">{error.message}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me to use any tool..."
            rows={1}
            className="flex-1 px-3 py-2 border border-input bg-background rounded-lg text-sm resize-none"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
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
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
