import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WorkspacesPage from "./page";

// Mock the WorkspaceList component
vi.mock("@/components/workspaces/workspace-list", () => ({
  WorkspaceList: () => <div data-testid="workspace-list">Workspace List</div>,
}));

describe("Workspaces Page", () => {
  it("should render the page", () => {
    render(<WorkspacesPage />);
    expect(screen.getByTestId("workspace-list")).toBeInTheDocument();
  });

  it("should render within a container", () => {
    const { container } = render(<WorkspacesPage />);
    const containerDiv = container.querySelector(".container");
    expect(containerDiv).toBeInTheDocument();
    expect(containerDiv?.classList.contains("mx-auto")).toBe(true);
    expect(containerDiv?.classList.contains("py-8")).toBe(true);
  });

  it("should display the WorkspaceList component", () => {
    render(<WorkspacesPage />);
    const workspaceList = screen.getByTestId("workspace-list");
    expect(workspaceList).toBeInTheDocument();
    expect(workspaceList.textContent).toBe("Workspace List");
  });
});
