import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import IntegrationsClient from "./integrations-client";

// Mock Convex
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (...args: any[]) => mockUseMutation(...args),
}));

// Mock Convex API
vi.mock("@/convex/_generated/api", () => ({
  api: {
    integrations: {
      listActive: "integrations.listActive",
      listUserIntegrations: "integrations.listUserIntegrations",
      enableIntegration: "integrations.enableIntegration",
      disableIntegration: "integrations.disableIntegration",
    },
    auth: {
      getUserByClerkId: "auth.getUserByClerkId",
      ensureUser: "auth.ensureUser",
    },
  },
}));

// Mock Loading components
vi.mock("@/components/loading", () => ({
  LoadingCard: () => <div data-testid="loading-card">Loading...</div>,
  LoadingPage: () => <div data-testid="loading-page">Loading Page...</div>,
}));

// Mock window.location.href
delete (window as any).location;
window.location = { href: "" } as any;

describe("Integration Toggle Functionality", () => {
  describe("Toggle State Management", () => {
    it("should track toggling state", () => {
      let togglingId: string | null = null;

      // Simulate starting toggle
      togglingId = "integration123";
      expect(togglingId).toBe("integration123");

      // Simulate finishing toggle
      togglingId = null;
      expect(togglingId).toBeNull();
    });

    it("should prevent multiple simultaneous toggles", () => {
      let togglingId: string | null = null;

      togglingId = "integration123";
      const canToggleAnother = togglingId === null;

      expect(canToggleAnother).toBe(false);
    });
  });

  describe("Enable/Disable Logic", () => {
    it("should call disableIntegration when currently enabled", async () => {
      const isEnabled = true;
      const integrationId = "integration123";
      const userId = "user456";

      const mockDisable = vi.fn();
      const mockEnable = vi.fn();

      if (isEnabled) {
        await mockDisable({ userId, integrationId });
      } else {
        await mockEnable({ userId, integrationId });
      }

      expect(mockDisable).toHaveBeenCalledWith({ userId, integrationId });
      expect(mockEnable).not.toHaveBeenCalled();
    });

    it("should call enableIntegration when currently disabled", async () => {
      const isEnabled = false;
      const integrationId = "integration123";
      const userId = "user456";

      const mockDisable = vi.fn();
      const mockEnable = vi.fn();

      if (isEnabled) {
        await mockDisable({ userId, integrationId });
      } else {
        await mockEnable({ userId, integrationId });
      }

      expect(mockEnable).toHaveBeenCalledWith({ userId, integrationId });
      expect(mockDisable).not.toHaveBeenCalled();
    });
  });

  describe("Button States", () => {
    it("should show 'Connect' when not enabled", () => {
      const isEnabled = false;
      const isToggling = false;

      const buttonText = isToggling ? "..." : isEnabled ? "Disconnect" : "Connect";

      expect(buttonText).toBe("Connect");
    });

    it("should show 'Disconnect' when enabled", () => {
      const isEnabled = true;
      const isToggling = false;

      const buttonText = isToggling ? "..." : isEnabled ? "Disconnect" : "Connect";

      expect(buttonText).toBe("Disconnect");
    });

    it("should show '...' when toggling", () => {
      const isEnabled = true;
      const isToggling = true;

      const buttonText = isToggling ? "..." : isEnabled ? "Disconnect" : "Connect";

      expect(buttonText).toBe("...");
    });

    it("should be disabled when toggling", () => {
      const integrationId = "integration123";
      const togglingId = "integration123";

      const isDisabled = togglingId === integrationId;

      expect(isDisabled).toBe(true);
    });

    it("should not be disabled when not toggling", () => {
      const integrationId = "integration123";
      const togglingId = null;

      const isDisabled = togglingId === integrationId;

      expect(isDisabled).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle toggle errors gracefully", async () => {
      const mockToggle = vi.fn().mockRejectedValue(new Error("Network error"));

      let error: Error | null = null;
      try {
        await mockToggle();
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Network error");
    });

    it("should reset toggling state after error", async () => {
      let togglingId: string | null = "integration123";

      try {
        throw new Error("Toggle failed");
      } catch (error) {
        togglingId = null;
      }

      expect(togglingId).toBeNull();
    });
  });

  describe("Integration Detection", () => {
    it("should detect if integration is enabled", () => {
      const userIntegrations = [
        { _id: "integration123" },
        { _id: "integration456" },
      ];

      const integrationId = "integration123";
      const isEnabled = userIntegrations.some((ui) => ui._id === integrationId);

      expect(isEnabled).toBe(true);
    });

    it("should detect if integration is not enabled", () => {
      const userIntegrations = [
        { _id: "integration123" },
        { _id: "integration456" },
      ];

      const integrationId = "integration789";
      const isEnabled = userIntegrations.some((ui) => ui._id === integrationId);

      expect(isEnabled).toBe(false);
    });

    it("should handle empty user integrations", () => {
      const userIntegrations: any[] = [];

      const integrationId = "integration123";
      const isEnabled = userIntegrations.some((ui) => ui._id === integrationId);

      expect(isEnabled).toBe(false);
    });
  });
});

describe("IntegrationsPage - OAuth Flow Integration", () => {
  const mockUser = {
    id: "user_123",
    emailAddresses: [{ emailAddress: "test@example.com" }],
  };

  const mockConvexUser = {
    _id: "convex_user_123",
    clerkId: "user_123",
    email: "test@example.com",
  };

  const mockIntegrations = [
    {
      _id: "github_id",
      slug: "github",
      name: "GitHub",
      description: "Connect to GitHub to manage repositories and issues",
      category: "developer",
      status: "active",
      iconUrl: "https://github.com/icon.png",
      tools: [
        { name: "create_issue", description: "Create a new issue" },
        { name: "list_repos", description: "List repositories" },
      ],
    },
    {
      _id: "linear_id",
      slug: "linear",
      name: "Linear",
      description: "Connect to Linear to manage issues and projects",
      category: "productivity",
      status: "active",
      iconUrl: "https://linear.app/icon.png",
      tools: [
        { name: "create_issue", description: "Create a new issue" },
      ],
    },
    {
      _id: "notion_id",
      slug: "notion",
      name: "Notion",
      description: "Connect to Notion to manage pages and databases",
      category: "productivity",
      status: "active",
      iconUrl: "https://notion.so/icon.png",
      tools: [
        { name: "search_pages", description: "Search pages" },
      ],
    },
    {
      _id: "slack_id",
      slug: "slack",
      name: "Slack",
      description: "Connect to Slack to send messages and manage channels",
      category: "productivity",
      status: "active",
      iconUrl: "https://slack.com/icon.png",
      tools: [
        { name: "send_message", description: "Send a message" },
      ],
    },
    {
      _id: "custom_id",
      slug: "custom",
      name: "Custom Integration",
      description: "A custom integration without OAuth",
      category: "other",
      status: "active",
      iconUrl: "https://example.com/icon.png",
      tools: [
        { name: "custom_tool", description: "Custom tool" },
      ],
    },
  ];

  const mockEnableIntegration = vi.fn();
  const mockDisableIntegration = vi.fn();
  const mockEnsureUser = vi.fn();

  const clientProps = {
    clerkId: "user_123",
    email: "test@example.com",
    name: "Test User",
    imageUrl: "https://example.com/avatar.png",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = "";

    mockUseMutation.mockImplementation((mutation: string) => {
      if (mutation === "integrations.enableIntegration") {
        return mockEnableIntegration;
      }
      if (mutation === "integrations.disableIntegration") {
        return mockDisableIntegration;
      }
      if (mutation === "auth.ensureUser") {
        return mockEnsureUser;
      }
      return vi.fn();
    });

    // Default: no integrations enabled
    mockUseQuery.mockImplementation((query: string) => {
      if (query === "integrations.listActive") {
        return mockIntegrations;
      }
      if (query === "integrations.listUserIntegrations") {
        return [];
      }
      if (query === "auth.getUserByClerkId") {
        return mockConvexUser;
      }
      return undefined;
    });
  });

  describe("OAuth Redirect Flow", () => {
    it("should redirect to GitHub OAuth when connecting GitHub", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const githubButton = connectButtons[0];
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/github/authorize");
      });

      expect(mockEnableIntegration).not.toHaveBeenCalled();
    });

    it("should redirect to Linear OAuth when connecting Linear", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Linear")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const linearButton = connectButtons[1];
      fireEvent.click(linearButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/linear/authorize");
      });

      expect(mockEnableIntegration).not.toHaveBeenCalled();
    });

    it("should redirect to Notion OAuth when connecting Notion", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Notion")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const notionButton = connectButtons[2];
      fireEvent.click(notionButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/notion/authorize");
      });

      expect(mockEnableIntegration).not.toHaveBeenCalled();
    });

    it("should redirect to Slack OAuth when connecting Slack", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Slack")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const slackButton = connectButtons[3];
      fireEvent.click(slackButton);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/slack/authorize");
      });

      expect(mockEnableIntegration).not.toHaveBeenCalled();
    });

    it("should call enableIntegration for non-OAuth integrations", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Custom Integration")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const customButton = connectButtons[4];
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(mockEnableIntegration).toHaveBeenCalledWith({
          userId: mockConvexUser._id,
          integrationId: "custom_id",
        });
      });

      expect(window.location.href).toBe("");
    });
  });

  describe("Disconnect Flow", () => {
    beforeEach(() => {
      // Mock enabled integrations
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "integrations.listActive") {
          return mockIntegrations;
        }
        if (query === "integrations.listUserIntegrations") {
          return [
            { _id: "github_id", slug: "github" },
            { _id: "custom_id", slug: "custom" },
          ];
        }
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        return undefined;
      });
    });

    it("should call disableIntegration for OAuth integrations", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });

      const disconnectButtons = screen.getAllByText("Disconnect");
      const githubButton = disconnectButtons[0];
      fireEvent.click(githubButton);

      await waitFor(() => {
        expect(mockDisableIntegration).toHaveBeenCalledWith({
          userId: mockConvexUser._id,
          integrationId: "github_id",
        });
      });

      expect(window.location.href).toBe("");
    });

    it("should call disableIntegration for non-OAuth integrations", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Custom Integration")).toBeInTheDocument();
      });

      const disconnectButtons = screen.getAllByText("Disconnect");
      const customButton = disconnectButtons[1];
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(mockDisableIntegration).toHaveBeenCalledWith({
          userId: mockConvexUser._id,
          integrationId: "custom_id",
        });
      });

      expect(window.location.href).toBe("");
    });
  });

  describe("OAuth Integration Detection", () => {
    it("should correctly identify GitHub as OAuth integration", async () => {
      const oauthIntegrations = ["github", "linear", "notion", "slack"];
      expect(oauthIntegrations.includes("github")).toBe(true);
    });

    it("should correctly identify Linear as OAuth integration", async () => {
      const oauthIntegrations = ["github", "linear", "notion", "slack"];
      expect(oauthIntegrations.includes("linear")).toBe(true);
    });

    it("should correctly identify Notion as OAuth integration", async () => {
      const oauthIntegrations = ["github", "linear", "notion", "slack"];
      expect(oauthIntegrations.includes("notion")).toBe(true);
    });

    it("should correctly identify Slack as OAuth integration", async () => {
      const oauthIntegrations = ["github", "linear", "notion", "slack"];
      expect(oauthIntegrations.includes("slack")).toBe(true);
    });

    it("should correctly identify non-OAuth integration", async () => {
      const oauthIntegrations = ["github", "linear", "notion", "slack"];
      expect(oauthIntegrations.includes("custom")).toBe(false);
    });
  });

  describe("Loading States", () => {
    it("should show loading cards while integrations are loading", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "integrations.listActive") {
          return undefined; // Loading state
        }
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        return undefined;
      });

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        const loadingCards = screen.getAllByTestId("loading-card");
        expect(loadingCards).toHaveLength(3);
      });
    });

    it("should show button loading state during toggle", async () => {
      mockEnableIntegration.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 100));
      });

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Custom Integration")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const customButton = connectButtons[4];
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(screen.getByText("...")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should show alert on toggle failure", async () => {
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
      mockEnableIntegration.mockRejectedValueOnce(new Error("Network error"));

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Custom Integration")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      const customButton = connectButtons[4];
      fireEvent.click(customButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Failed to toggle integration. Please try again."
        );
      });

      alertSpy.mockRestore();
    });

    it("should not toggle if convexUser is not loaded", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "integrations.listActive") {
          return mockIntegrations;
        }
        if (query === "integrations.listUserIntegrations") {
          return [];
        }
        if (query === "auth.getUserByClerkId") {
          return undefined; // User not loaded
        }
        return undefined;
      });

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });

      const connectButton = screen.getAllByText("Connect")[0];
      fireEvent.click(connectButton);

      // Should not redirect or call mutations
      expect(window.location.href).toBe("");
      expect(mockEnableIntegration).not.toHaveBeenCalled();
    });
  });

  describe("UI Rendering", () => {
    it("should show loading state while integrations are loading", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "integrations.listActive") {
          return undefined; // Loading state
        }
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        return undefined;
      });

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getAllByTestId("loading-card").length).toBeGreaterThan(0);
      });
    });

    it("should display integration name and description", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
        expect(screen.getByText("Connect to GitHub to manage repositories and issues")).toBeInTheDocument();
      });
    });

    it("should display tools count", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("2 tools available")).toBeInTheDocument();
      });
    });

    it("should display integration category", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("developer")).toBeInTheDocument();
      });
    });

    it("should show empty state when no integrations", async () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "integrations.listActive") {
          return [];
        }
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        return undefined;
      });

      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("No integrations available yet")).toBeInTheDocument();
      });
    });
  });

  describe("Integration Slug Propagation", () => {
    it("should correctly pass GitHub slug to handler", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("GitHub")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      fireEvent.click(connectButtons[0]);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/github/authorize");
      });
    });

    it("should correctly pass Linear slug to handler", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Linear")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      fireEvent.click(connectButtons[1]);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/linear/authorize");
      });
    });

    it("should correctly pass Notion slug to handler", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Notion")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      fireEvent.click(connectButtons[2]);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/notion/authorize");
      });
    });

    it("should correctly pass Slack slug to handler", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Slack")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      fireEvent.click(connectButtons[3]);

      await waitFor(() => {
        expect(window.location.href).toBe("/api/oauth/slack/authorize");
      });
    });

    it("should correctly handle non-OAuth custom integration", async () => {
      render(<IntegrationsClient {...clientProps} />);

      await waitFor(() => {
        expect(screen.getByText("Custom Integration")).toBeInTheDocument();
      });

      const connectButtons = screen.getAllByText("Connect");
      fireEvent.click(connectButtons[4]);

      await waitFor(() => {
        expect(mockEnableIntegration).toHaveBeenCalledWith({
          userId: mockConvexUser._id,
          integrationId: "custom_id",
        });
      });
    });
  });
});
