/**
 * Tests for Usage Analytics Dashboard
 * Tests the UsageClient component which handles all the UI logic
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UsageClient from "./usage-client";

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
      getUserStats: "usage.getUserStats",
      getUserLogs: "usage.getUserLogs",
    },
  },
}));

// Mock Loading components
vi.mock("@/components/loading", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
  LoadingTable: () => <div data-testid="loading-table">Loading table...</div>,
  LoadingSkeleton: ({ width, height }: { width?: string; height?: string }) => (
    <div data-testid="loading-skeleton" className={`${width || ""} ${height || ""}`}>
      Loading...
    </div>
  ),
}));

describe("UsageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Loading States", () => {
    it("should show loading state while fetching user data", () => {
      // Mock queries to return undefined (loading state)
      mockUseQuery.mockReturnValue(undefined);

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Usage Analytics")).toBeInTheDocument();
      expect(screen.getAllByTestId("loading-skeleton")).toHaveLength(8); // 4 cards x 2 skeletons each
    });
  });

  describe("Stats Cards", () => {
    it("should display total requests", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1250,
            successfulRequests: 1200,
            failedRequests: 50,
            avgLatency: 145,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Total Requests")).toBeInTheDocument();
      expect(screen.getByText("1,250")).toBeInTheDocument();
    });

    it("should display successful requests with percentage", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            avgLatency: 120,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Successful")).toBeInTheDocument();
      expect(screen.getByText("950")).toBeInTheDocument();
      expect(screen.getByText("95.0%")).toBeInTheDocument();
    });

    it("should display failed requests with percentage", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            avgLatency: 120,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("5.0%")).toBeInTheDocument();
    });

    it("should display average latency", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 500,
            successfulRequests: 490,
            failedRequests: 10,
            avgLatency: 235,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Avg Latency")).toBeInTheDocument();
      expect(screen.getByText("235")).toBeInTheDocument();
      expect(screen.getByText("ms")).toBeInTheDocument();
    });

    it("should handle zero requests correctly", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgLatency: 0,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      // Check that zero values are displayed (multiple "0" texts exist)
      const zeroTexts = screen.getAllByText("0");
      expect(zeroTexts.length).toBeGreaterThan(0);
      expect(screen.getAllByText("0%")).toHaveLength(2); // Success and failure percentages
    });
  });

  describe("Usage by Integration", () => {
    it("should display integration usage breakdown", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            avgLatency: 120,
            byIntegration: {
              github: 600,
              linear: 250,
              notion: 150,
            },
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Usage by Integration")).toBeInTheDocument();
      expect(screen.getByText("github")).toBeInTheDocument();
      expect(screen.getByText("linear")).toBeInTheDocument();
      expect(screen.getByText("notion")).toBeInTheDocument();
      expect(screen.getByText("600 (60.0%)")).toBeInTheDocument();
      expect(screen.getByText("250 (25.0%)")).toBeInTheDocument();
      expect(screen.getByText("150 (15.0%)")).toBeInTheDocument();
    });

    it("should sort integrations by usage count", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1000,
            successfulRequests: 950,
            failedRequests: 50,
            avgLatency: 120,
            byIntegration: {
              notion: 50,
              github: 800,
              linear: 150,
            },
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      const { container } = render(<UsageClient clerkId="clerk_user_123" />);

      const integrations = container.querySelectorAll(".capitalize");
      const integrationNames = Array.from(integrations).map(
        (el) => el.textContent
      );

      // Should be sorted by count (descending): github (800), linear (150), notion (50)
      expect(integrationNames[0]).toBe("github");
      expect(integrationNames[1]).toBe("linear");
      expect(integrationNames[2]).toBe("notion");
    });

    it("should not display integration section when no integrations used", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgLatency: 0,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.queryByText("Usage by Integration")).not.toBeInTheDocument();
    });
  });

  describe("Recent Activity Table", () => {
    it("should display recent activity logs", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 3,
            successfulRequests: 2,
            failedRequests: 1,
            avgLatency: 150,
            byIntegration: { github: 3 },
          };
        }
        if (query === "usage.getUserLogs") {
          return [
            {
              _id: "log_1",
              _creationTime: Date.now(),
              integrationName: "GitHub",
              integrationSlug: "github",
              toolName: "create_issue",
              status: "success",
              latencyMs: 120,
            },
            {
              _id: "log_2",
              _creationTime: Date.now() - 60000,
              integrationName: "Linear",
              integrationSlug: "linear",
              toolName: "create_issue_linear",
              status: "success",
              latencyMs: 180,
            },
            {
              _id: "log_3",
              _creationTime: Date.now() - 120000,
              integrationName: "GitHub",
              integrationSlug: "github",
              toolName: "list_repos",
              status: "error",
              latencyMs: 5000,
            },
          ];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
      expect(screen.getAllByText("GitHub")).toHaveLength(2); // Two GitHub entries
      expect(screen.getByText("Linear")).toBeInTheDocument();
      expect(screen.getByText("create_issue")).toBeInTheDocument();
      expect(screen.getByText("create_issue_linear")).toBeInTheDocument();
      expect(screen.getByText("list_repos")).toBeInTheDocument();
      expect(screen.getByText("120ms")).toBeInTheDocument();
      expect(screen.getByText("180ms")).toBeInTheDocument();
      expect(screen.getByText("5000ms")).toBeInTheDocument();
    });

    it("should display loading state for activity table", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgLatency: 0,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return undefined; // Loading state
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByTestId("loading-table")).toBeInTheDocument();
    });

    it("should show empty state when no logs exist", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            avgLatency: 0,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      expect(screen.getByText("No activity recorded yet")).toBeInTheDocument();
    });

    it("should display success status badge", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1,
            successfulRequests: 1,
            failedRequests: 0,
            avgLatency: 100,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [
            {
              _id: "log_1",
              _creationTime: Date.now(),
              integrationName: "GitHub",
              toolName: "create_issue",
              status: "success",
              latencyMs: 100,
            },
          ];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      // Find the status badge in the table (has rounded-full class)
      const badge = screen.getByText("success");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-green-500/10");
      expect(badge.className).toContain("rounded-full");
    });

    it("should display error status badge", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return { _id: "user_123" };
        }
        if (query === "usage.getUserStats") {
          return {
            totalRequests: 1,
            successfulRequests: 0,
            failedRequests: 1,
            avgLatency: 200,
            byIntegration: {},
          };
        }
        if (query === "usage.getUserLogs") {
          return [
            {
              _id: "log_1",
              _creationTime: Date.now(),
              integrationName: "GitHub",
              toolName: "create_issue",
              status: "error",
              latencyMs: 200,
            },
          ];
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      // Find the status badge in the table (has rounded-full class)
      const badge = screen.getByText("error");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("bg-destructive/10");
      expect(badge.className).toContain("rounded-full");
    });
  });

  describe("Real-time Updates", () => {
    it("should use Convex useQuery for real-time data", () => {
      mockUseQuery.mockImplementation(() => undefined);

      render(<UsageClient clerkId="clerk_user_123" />);

      // Verify that useQuery was called with the correct API endpoints
      expect(mockUseQuery).toHaveBeenCalledWith(
        "auth.getUserByClerkId",
        expect.objectContaining({ clerkId: "clerk_user_123" })
      );
    });

    it("should skip queries when user is not loaded", () => {
      mockUseQuery.mockImplementation((query: string) => {
        if (query === "auth.getUserByClerkId") {
          return undefined; // User not loaded yet
        }
        return undefined;
      });

      render(<UsageClient clerkId="clerk_user_123" />);

      // Should call getUserByClerkId
      expect(mockUseQuery).toHaveBeenCalledWith(
        "auth.getUserByClerkId",
        expect.objectContaining({ clerkId: "clerk_user_123" })
      );

      // Should skip other queries with "skip"
      expect(mockUseQuery).toHaveBeenCalledWith(
        "usage.getUserStats",
        "skip"
      );
      expect(mockUseQuery).toHaveBeenCalledWith(
        "usage.getUserLogs",
        "skip"
      );
    });
  });
});
