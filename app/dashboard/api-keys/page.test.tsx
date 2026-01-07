import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ApiKeysPage from "./page";

// Mock Clerk useUser hook
const mockUser = {
  id: "user_123",
  primaryEmailAddress: { emailAddress: "test@example.com" },
  fullName: "Test User",
};

const mockUseUser = vi.fn(() => ({
  user: mockUser,
  isLoaded: true,
  isSignedIn: true,
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => mockUseUser(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ApiKeysPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset to default mock state
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Initial Load", () => {
    it("should fetch API keys on mount when user is loaded", async () => {
      const mockKeys = [
        {
          _id: "key1",
          name: "Production",
          _creationTime: Date.now(),
          lastUsed: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: mockKeys }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/keys");
      });

      await waitFor(() => {
        expect(screen.getByText("Production")).toBeInTheDocument();
      });
    });

    it("should show loading state while fetching keys", async () => {
      // Mock a delayed fetch
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ keys: [] }),
                }),
              100
            )
          )
      );

      render(<ApiKeysPage />);

      // Should show loading spinner initially
      expect(
        document.querySelector(".animate-spin")
      ).toBeInTheDocument();
    });

    it("should display empty state when no keys exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [] }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("No API keys created yet")).toBeInTheDocument();
      });
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<ApiKeysPage />);

      // Should not crash and should show empty state
      await waitFor(() => {
        expect(screen.getByText("No API keys created yet")).toBeInTheDocument();
      });
    });
  });

  describe("API Key Display", () => {
    it("should display multiple API keys", async () => {
      const mockKeys = [
        {
          _id: "key1",
          name: "Production",
          _creationTime: Date.now(),
          lastUsed: Date.now(),
        },
        {
          _id: "key2",
          name: "Development",
          _creationTime: Date.now(),
          lastUsed: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: mockKeys }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Production")).toBeInTheDocument();
        expect(screen.getByText("Development")).toBeInTheDocument();
      });
    });

    it("should display creation date for each key", async () => {
      const creationTime = new Date("2024-01-15").getTime();
      const mockKeys = [
        {
          _id: "key1",
          name: "Test Key",
          _creationTime: creationTime,
          lastUsed: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: mockKeys }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/Created:/)).toBeInTheDocument();
      });
    });

    it("should display last used date when available", async () => {
      const mockKeys = [
        {
          _id: "key1",
          name: "Used Key",
          _creationTime: Date.now() - 86400000,
          lastUsed: Date.now(),
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: mockKeys }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText(/Last used:/)).toBeInTheDocument();
      });
    });
  });

  describe("Key Creation", () => {
    it("should create a new key when form is submitted", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keyId: "newkey1",
            apiKey: "mcp_sk_test123",
            name: "New Key",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keys: [{ _id: "newkey1", name: "New Key", _creationTime: Date.now() }],
          }),
        });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Key name/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Key name/);
      fireEvent.change(input, { target: { value: "New Key" } });

      const createButton = screen.getByText("Create Key");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/keys", expect.objectContaining({
          method: "POST",
        }));
      });
    });

    it("should display newly created key for copying", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keyId: "newkey1",
            apiKey: "mcp_sk_abcdef123456",
            name: "New Key",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Key name/)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Key name/);
      fireEvent.change(input, { target: { value: "New Key" } });

      const createButton = screen.getByText("Create Key");
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText("API Key Created Successfully!")).toBeInTheDocument();
      });

      expect(screen.getByText("mcp_sk_abcdef123456")).toBeInTheDocument();
    });

    it("should disable create button when name is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [] }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        const createButton = screen.getByText("Create Key");
        expect(createButton).toBeDisabled();
      });
    });
  });

  describe("Key Revocation", () => {
    it("should show revoke button for each key", async () => {
      const mockKeys = [
        {
          _id: "key1",
          name: "Test Key",
          _creationTime: Date.now(),
          lastUsed: null,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: mockKeys }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });
    });

    it("should call revoke API when confirmed", async () => {
      const mockKeys = [
        {
          _id: "key1",
          name: "Test Key",
          _creationTime: Date.now(),
          lastUsed: null,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: mockKeys }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        });

      // Mock window.confirm
      vi.spyOn(window, "confirm").mockReturnValue(true);

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Revoke")).toBeInTheDocument();
      });

      const revokeButton = screen.getByText("Revoke");
      fireEvent.click(revokeButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/keys?id=key1", {
          method: "DELETE",
        });
      });
    });
  });

  describe("Refresh", () => {
    it("should have a refresh button", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [] }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    it("should refetch keys when refresh is clicked", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ keys: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            keys: [{ _id: "key1", name: "New Key", _creationTime: Date.now() }],
          }),
        });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });

      const refreshButton = screen.getByText("Refresh");
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("User Not Logged In", () => {
    it("should show sign in message when user is not logged in", async () => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      });

      render(<ApiKeysPage />);

      expect(screen.getByText("Please sign in to manage API keys")).toBeInTheDocument();
    });
  });

  describe("Usage Instructions", () => {
    it("should display usage instructions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ keys: [] }),
      });

      render(<ApiKeysPage />);

      await waitFor(() => {
        expect(screen.getByText("Usage Instructions")).toBeInTheDocument();
      });

      expect(screen.getByText(/mcpServers/)).toBeInTheDocument();
    });
  });
});

describe("API Keys User ID Mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset to default mock state
    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    });
  });

  it("should load keys automatically without requiring manual refresh", async () => {
    const mockKeys = [
      {
        _id: "key1",
        name: "Auto-loaded Key",
        _creationTime: Date.now(),
        lastUsed: null,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: mockKeys }),
    });

    render(<ApiKeysPage />);

    // Keys should be fetched automatically
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/keys");
    });

    // Keys should be displayed without clicking refresh
    await waitFor(() => {
      expect(screen.getByText("Auto-loaded Key")).toBeInTheDocument();
    });
  });

  it("should handle 404 when user not found in Convex", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "User not found" }),
    });

    render(<ApiKeysPage />);

    // Should show empty state, not crash
    await waitFor(() => {
      expect(screen.getByText("No API keys created yet")).toBeInTheDocument();
    });
  });

  it("should handle empty keys array from API", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: [] }),
    });

    render(<ApiKeysPage />);

    await waitFor(() => {
      expect(screen.getByText("No API keys created yet")).toBeInTheDocument();
    });
  });

  it("should handle null keys from API gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ keys: null }),
    });

    render(<ApiKeysPage />);

    // Should fallback to empty array and show empty state
    await waitFor(() => {
      expect(screen.getByText("No API keys created yet")).toBeInTheDocument();
    });
  });
});
