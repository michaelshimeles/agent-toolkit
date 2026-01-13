import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServerDetailPage from "./page";

// Create mock functions using vi.hoisted
const { mockUseQuery, mockUseAction, mockUseUser, mockUseParams } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
  mockUseAction: vi.fn(),
  mockUseUser: vi.fn(),
  mockUseParams: vi.fn(),
}));

// Mock dependencies
vi.mock("convex/react", () => ({
  useQuery: mockUseQuery,
  useAction: mockUseAction,
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: mockUseUser,
}));

vi.mock("next/navigation", () => ({
  useParams: mockUseParams,
}));

vi.mock("@/components/loading", () => ({
  LoadingPage: () => <div data-testid="loading">Loading...</div>,
}));

vi.mock("@/components/sharing/share-dialog", () => ({
  ShareDialog: ({ serverId }: { serverId: string }) => (
    <button data-testid="share-dialog">Share {serverId}</button>
  ),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));

const mockServer = {
  _id: "server123",
  name: "Test Server",
  description: "A test server",
  slug: "test-server",
  status: "draft",
  sourceType: "openapi",
  sourceUrl: "https://api.example.com/spec",
  version: 1,
  rateLimit: 60,
  allowedDomains: ["api.example.com"],
  tools: [
    {
      name: "get_users",
      description: "Get all users",
      schema: {},
    },
    {
      name: "create_user",
      description: "Create a new user",
      schema: {},
    },
  ],
  code: 'export default function handler(req, res) {\n  res.json({ message: "Hello" });\n}',
  readme: "# Test Server\n\nThis is a test server.",
};

describe("Server Detail Page - Collaboration Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseUser.mockReturnValue({
      user: { id: "user123", name: "Test User" },
    });

    mockUseParams.mockReturnValue({
      serverId: "server123",
    });

    mockUseQuery.mockReturnValue(mockServer);
    mockUseAction.mockReturnValue(vi.fn());
  });

  it("should render ShareDialog component", () => {
    render(<ServerDetailPage />);
    const shareDialog = screen.getByTestId("share-dialog");
    expect(shareDialog).toBeInTheDocument();
    expect(shareDialog.textContent).toBe("Share server123");
  });

  it("should show loading when user is not available", () => {
    mockUseUser.mockReturnValue({ user: null });

    render(<ServerDetailPage />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("should show loading when server is not available", () => {
    mockUseQuery.mockReturnValue(null);

    render(<ServerDetailPage />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("should display server name and description", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("Test Server")).toBeInTheDocument();
    expect(screen.getByText("A test server")).toBeInTheDocument();
  });

  it("should display all detected tools", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("get_users")).toBeInTheDocument();
    expect(screen.getByText("Get all users")).toBeInTheDocument();
    expect(screen.getByText("create_user")).toBeInTheDocument();
    expect(screen.getByText("Create a new user")).toBeInTheDocument();
  });

  it("should display generated code", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText(/export default function handler/)).toBeInTheDocument();
  });

  it("should display auto-generated documentation when available", () => {
    render(<ServerDetailPage />);
    // The markdown content is rendered via ReactMarkdown mock
    const markdownContent = screen.getByTestId("markdown-content");
    expect(markdownContent).toBeInTheDocument();
    expect(markdownContent.textContent).toContain("# Test Server");
    expect(markdownContent.textContent).toContain("This is a test server.");
  });

  it("should not display documentation when not available", () => {
    mockUseQuery.mockReturnValue({ ...mockServer, readme: null });

    render(<ServerDetailPage />);
    expect(screen.queryByText("Auto-Generated Documentation")).not.toBeInTheDocument();
  });

  it("should display server status", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("should display deploy button when status is not deployed", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("Deploy Server →")).toBeInTheDocument();
  });

  it("should display copy button when status is deployed", () => {
    mockUseQuery.mockReturnValue({
      ...mockServer,
      status: "deployed",
      deploymentUrl: "https://test.vercel.app",
    });

    render(<ServerDetailPage />);
    // The deployed state shows multiple "Copy" buttons (code and config)
    const copyButtons = screen.getAllByText("Copy");
    expect(copyButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("should show warning but allow deploy when no tools are available", () => {
    mockUseQuery.mockReturnValue({ ...mockServer, tools: [] });

    render(<ServerDetailPage />);
    const deployButton = screen.getByText("Deploy Server →");
    // Deploy button should NOT be disabled - users can deploy with no tools
    expect(deployButton).not.toBeDisabled();
    // Warning message should be shown (yellow warning near deploy button)
    expect(screen.getByText(/You can still deploy/)).toBeInTheDocument();
  });

  it("should display security configuration", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("Security Configuration")).toBeInTheDocument();
    expect(screen.getByText("Rate Limit (requests/min)")).toBeInTheDocument();
    expect(screen.getByText("Allowed Domains")).toBeInTheDocument();
  });

  it("should display rate limit value", () => {
    render(<ServerDetailPage />);
    const rateLimitInput = screen.getByDisplayValue("60");
    expect(rateLimitInput).toBeInTheDocument();
  });

  it("should display allowed domains", () => {
    render(<ServerDetailPage />);
    const domainsTextarea = screen.getByDisplayValue("api.example.com");
    expect(domainsTextarea).toBeInTheDocument();
  });

  it("should display back to builder link", () => {
    render(<ServerDetailPage />);
    const backLink = screen.getByText("← Back to Builder");
    expect(backLink).toBeInTheDocument();
    expect(backLink.getAttribute("href")).toBe("/dashboard/builder");
  });

  it("should display source type and URL", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("openapi")).toBeInTheDocument();
    expect(screen.getByText("https://api.example.com/spec")).toBeInTheDocument();
  });

  it("should display version", () => {
    render(<ServerDetailPage />);
    expect(screen.getByText("v1")).toBeInTheDocument();
  });

  it("should display tool count", () => {
    render(<ServerDetailPage />);
    const toolsElements = screen.getAllByText("2");
    expect(toolsElements.length).toBeGreaterThan(0);
  });
});
