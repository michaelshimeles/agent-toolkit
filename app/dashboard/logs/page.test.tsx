/**
 * Tests for Activity Logs Dashboard
 * Tests the LogsClient component which handles all the UI logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LogsClient from "./logs-client";

// Mock Convex
const mockUseQuery = vi.fn();
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Mock Convex API
vi.mock("@/convex/_generated/api", () => ({
  api: {
    auth: { getUserByClerkId: "auth.getUserByClerkId" },
    usage: {
      getUserLogs: "usage.getUserLogs",
    },
  },
}));

// Mock Loading components
vi.mock("@/components/loading", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
  LoadingTable: () => <div data-testid="loading-table">Loading table...</div>,
}));

describe("LogsClient", () => {
  const mockConvexUser = {
    _id: "convex_user_123",
    clerkId: "clerk_user_123",
    email: "test@example.com",
  };

  const mockLogs = [
    {
      _id: "log_1",
      _creationTime: Date.now() - 1000,
      userId: "convex_user_123",
      integrationId: "github_id",
      integrationName: "GitHub",
      integrationSlug: "github",
      toolName: "create_issue",
      status: "success",
      latencyMs: 150,
    },
    {
      _id: "log_2",
      _creationTime: Date.now() - 5000,
      userId: "convex_user_123",
      integrationId: "linear_id",
      integrationName: "Linear",
      integrationSlug: "linear",
      toolName: "create_issue",
      status: "error",
      latencyMs: 350,
    },
    {
      _id: "log_3",
      _creationTime: Date.now() - 10000,
      userId: "convex_user_123",
      integrationId: "slack_id",
      integrationName: "Slack",
      integrationSlug: "slack",
      toolName: "send_message",
      status: "success",
      latencyMs: 75,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading state while fetching user data", () => {
      mockUseQuery.mockReturnValue(undefined);

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Activity Logs")).toBeInTheDocument();
      expect(screen.getByTestId("loading-table")).toBeInTheDocument();
    });
  });

  describe("Logs Display", () => {
    it("should display activity logs table", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Activity Logs")).toBeInTheDocument();
      expect(
        screen.getByText("Recent tool calls across all integrations")
      ).toBeInTheDocument();
    });

    it("should display log entries with correct information", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("GitHub")).toBeInTheDocument();
      expect(screen.getByText("Linear")).toBeInTheDocument();
      expect(screen.getByText("Slack")).toBeInTheDocument();
    });

    it("should display tool names", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      const createIssueElements = screen.getAllByText("create_issue");
      expect(createIssueElements).toHaveLength(2);
      expect(screen.getByText("send_message")).toBeInTheDocument();
    });

    it("should display success status", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      const successBadges = screen.getAllByText("Success");
      expect(successBadges).toHaveLength(2);
    });

    it("should display error status", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("should display latency information", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("150ms")).toBeInTheDocument();
      expect(screen.getByText("350ms")).toBeInTheDocument();
      expect(screen.getByText("75ms")).toBeInTheDocument();
    });

    it("should display integration slugs", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("github")).toBeInTheDocument();
      expect(screen.getByText("linear")).toBeInTheDocument();
      expect(screen.getByText("slack")).toBeInTheDocument();
    });
  });

  describe("Empty State", () => {
    it("should show empty state when no logs exist", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(
        screen.getByText(
          /No activity logs yet. Start using integrations to see logs here./
        )
      ).toBeInTheDocument();
    });
  });

  describe("Limit Filter", () => {
    beforeEach(() => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });
    });

    it("should display limit selector with default value of 50", () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      const select = screen.getByLabelText("Show:");
      expect(select).toHaveValue("50");
    });

    it("should have option for 25 logs", () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Last 25")).toBeInTheDocument();
    });

    it("should have option for 50 logs", () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Last 50")).toBeInTheDocument();
    });

    it("should have option for 100 logs", () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Last 100")).toBeInTheDocument();
    });

    it("should have option for 250 logs", () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Last 250")).toBeInTheDocument();
    });

    it("should update limit when selection changes", async () => {
      render(<LogsClient clerkId="clerk_user_123" />);

      const select = screen.getByLabelText("Show:");
      fireEvent.change(select, { target: { value: "100" } });

      await waitFor(() => {
        expect(select).toHaveValue("100");
      });
    });
  });

  describe("Table Headers", () => {
    it("should display all column headers", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Time")).toBeInTheDocument();
      expect(screen.getByText("Integration")).toBeInTheDocument();
      expect(screen.getByText("Tool")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Latency")).toBeInTheDocument();
    });
  });

  describe("Summary", () => {
    it("should display log count summary", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return mockLogs;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Showing 3 most recent logs")).toBeInTheDocument();
    });

    it("should use singular form for single log", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return [mockLogs[0]];
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Showing 1 most recent log")).toBeInTheDocument();
    });

    it("should not show summary when no logs", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      expect(screen.queryByText(/Showing .* most recent/)).not.toBeInTheDocument();
    });
  });

  describe("Timestamp Formatting", () => {
    it("should format timestamps as locale string", () => {
      const fixedTime = new Date("2024-01-15T10:30:00").getTime();
      const logsWithFixedTime = [
        {
          ...mockLogs[0],
          _creationTime: fixedTime,
        },
      ];

      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return logsWithFixedTime;
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      const expectedDate = new Date(fixedTime).toLocaleString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  describe("Status Badge Styling", () => {
    it("should use green styling for success status", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return [
            {
              ...mockLogs[0],
              status: "success",
            },
          ];
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      const successBadge = screen.getByText("Success");
      expect(successBadge.className).toContain("bg-green-500/10");
      expect(successBadge.className).toContain("text-green-500");
    });

    it("should use red styling for error status", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return mockConvexUser;
        }
        if (query === "usage.getUserLogs") {
          return [
            {
              ...mockLogs[1],
              status: "error",
            },
          ];
        }
        return undefined;
      });

      render(<LogsClient clerkId="clerk_user_123" />);

      const errorBadge = screen.getByText("Error");
      expect(errorBadge.className).toContain("bg-destructive/10");
      expect(errorBadge.className).toContain("text-destructive");
    });
  });
});
