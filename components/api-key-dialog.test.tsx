import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiKeyDialog } from "./api-key-dialog";
import { Id } from "@/convex/_generated/dataModel";

// Mock Convex mutations and queries
const mockStoreKey = vi.fn();
const mockGetExistingKey = vi.fn();

vi.mock("convex/react", () => ({
  useMutation: () => mockStoreKey,
  useQuery: vi.fn((_, args) => {
    if (args?.serviceName === "OpenWeatherMap") {
      return mockGetExistingKey();
    }
    return null;
  }),
}));

describe("ApiKeyDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: "user123" as Id<"users">,
    serverId: "server123" as Id<"generatedServers">,
    serviceName: "OpenWeatherMap",
    serviceUrl: "https://openweathermap.org/api",
    instructions: "1. Sign up at https://openweathermap.org/api\n2. Get your free API key\n3. The key will be automatically stored and used",
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dialog Rendering", () => {
    it("should render dialog with correct title and description", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      expect(screen.getByText("OpenWeatherMap API Key Required")).toBeInTheDocument();
      expect(screen.getByText(/This MCP server requires an API key from OpenWeatherMap/)).toBeInTheDocument();
    });

    it("should display service URL when provided", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      const link = screen.getByText("https://openweathermap.org/api");
      expect(link).toBeInTheDocument();
      expect(link.closest("a")).toHaveAttribute("href", "https://openweathermap.org/api");
      expect(link.closest("a")).toHaveAttribute("target", "_blank");
    });

    it("should display instructions when provided", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      expect(screen.getByText(/1. Sign up at https:\/\/openweathermap.org\/api/)).toBeInTheDocument();
      expect(screen.getByText(/2. Get your free API key/)).toBeInTheDocument();
      expect(screen.getByText(/3. The key will be automatically stored and used/)).toBeInTheDocument();
    });

    it("should not show existing key warning when no key exists", () => {
      mockGetExistingKey.mockReturnValue(null);
      render(<ApiKeyDialog {...defaultProps} />);
      
      expect(screen.queryByText(/You already have a.*API key stored/)).not.toBeInTheDocument();
    });

    it("should show existing key warning when key exists", () => {
      mockGetExistingKey.mockReturnValue({
        _id: "existing-key-id",
        serviceName: "OpenWeatherMap",
        keyName: "Existing Weather Key",
      });
      
      render(<ApiKeyDialog {...defaultProps} />);
      
      expect(screen.getByText(/You already have a OpenWeatherMap API key stored/)).toBeInTheDocument();
    });
  });

  describe("Form Interaction", () => {
    it("should allow entering API key", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      const keyInput = screen.getByPlaceholderText("Enter your API key");
      expect(keyInput).toBeInTheDocument();
      
      fireEvent.change(keyInput, { target: { value: "test-api-key-123" } });
      expect(keyInput).toHaveValue("test-api-key-123");
    });

    it("should allow changing key name", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      const nameInput = screen.getByDisplayValue("OpenWeatherMap API Key");
      expect(nameInput).toBeInTheDocument();
      
      fireEvent.change(nameInput, { target: { value: "Custom Weather Key" } });
      expect(nameInput).toHaveValue("Custom Weather Key");
    });

    it("should disable save button when API key is empty", async () => {
      render(<ApiKeyDialog {...defaultProps} />);

      const saveButton = screen.getByText("Save API Key");

      // Button should be disabled when API key is empty
      expect(saveButton).toBeDisabled();
    });

    it("should call storeKey mutation with correct parameters", async () => {
      mockStoreKey.mockResolvedValue("new-key-id");
      render(<ApiKeyDialog {...defaultProps} />);
      
      const keyInput = screen.getByPlaceholderText("Enter your API key");
      const nameInput = screen.getByDisplayValue("OpenWeatherMap API Key");
      const saveButton = screen.getByText("Save API Key");
      
      fireEvent.change(keyInput, { target: { value: "user-api-key-456" } });
      fireEvent.change(nameInput, { target: { value: "User Weather Key" } });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockStoreKey).toHaveBeenCalledWith({
          userId: "user123",
          serverId: "server123",
          serviceName: "OpenWeatherMap",
          serviceKey: "user-api-key-456",
          keyName: "User Weather Key",
        });
      });
    });

    it("should close dialog and call onSuccess after successful save", async () => {
      mockStoreKey.mockResolvedValue("success-key-id");
      render(<ApiKeyDialog {...defaultProps} />);
      
      const keyInput = screen.getByPlaceholderText("Enter your API key");
      const saveButton = screen.getByText("Save API Key");
      
      fireEvent.change(keyInput, { target: { value: "test-key-success" } });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it("should show loading state while saving", async () => {
      mockStoreKey.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<ApiKeyDialog {...defaultProps} />);
      
      const keyInput = screen.getByPlaceholderText("Enter your API key");
      const saveButton = screen.getByText("Save API Key");
      
      fireEvent.change(keyInput, { target: { value: "loading-test-key" } });
      fireEvent.click(saveButton);
      
      expect(screen.getByText("Saving...")).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  describe("Dialog Actions", () => {
    it("should call onClose when Skip button is clicked", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      const skipButton = screen.getByText("Skip for now");
      fireEvent.click(skipButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when dialog is closed", () => {
      render(<ApiKeyDialog {...defaultProps} />);
      
      // Simulate dialog close via escape key or overlay click
      fireEvent.keyDown(document, { key: "Escape" });
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should display error message when save fails", async () => {
      const errorMessage = "Failed to save API key";
      mockStoreKey.mockRejectedValue(new Error(errorMessage));
      
      render(<ApiKeyDialog {...defaultProps} />);
      
      const keyInput = screen.getByPlaceholderText("Enter your API key");
      const saveButton = screen.getByText("Save API Key");
      
      fireEvent.change(keyInput, { target: { value: "error-test-key" } });
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it("should clear error on next successful save attempt", async () => {
      mockStoreKey.mockRejectedValue(new Error("First error"));
      render(<ApiKeyDialog {...defaultProps} />);

      const keyInput = screen.getByPlaceholderText("Enter your API key");
      const saveButton = screen.getByText("Save API Key");

      // First attempt - should show error
      fireEvent.change(keyInput, { target: { value: "first-attempt" } });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText("First error")).toBeInTheDocument();
      });

      // Second attempt - should clear error when save is clicked (setError(null) is called)
      mockStoreKey.mockResolvedValue("success-id");
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText("First error")).not.toBeInTheDocument();
      });
    });
  });
});