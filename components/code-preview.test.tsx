/**
 * Tests for Code Preview Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CodePreview } from "./code-preview";

// Mock CodeEditor component
vi.mock("./code-editor", () => ({
  CodeEditor: ({ value, onChange }: any) => (
    <div data-testid="code-editor">
      <textarea
        data-testid="editor-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

describe("CodePreview", () => {
  const mockCode = `
    import { Elysia } from "elysia";

    export const app = new Elysia()
      .get("/test_get", () => ({ message: "Hello" }))
      .post("/test_post", ({ body }) => ({ created: true }));
  `;

  const mockTools = [
    {
      name: "test_get",
      description: "Test GET endpoint",
      schema: {
        type: "object",
        properties: {
          id: { type: "string", example: "123" },
        },
        required: ["id"],
      },
    },
    {
      name: "test_post",
      description: "Test POST endpoint",
      schema: {
        type: "object",
        properties: {
          name: { type: "string", example: "John" },
          email: { type: "string", example: "john@example.com" },
        },
        required: ["name", "email"],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render the code preview component", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText("Code Preview & Testing")).toBeInTheDocument();
    });

    it("should not show editor by default", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
    });

    it("should show editor when toggle is clicked", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const toggleButton = screen.getByText("Show Editor");
      fireEvent.click(toggleButton);

      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });

    it("should hide editor when toggle is clicked again", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const showButton = screen.getByText("Show Editor");
      fireEvent.click(showButton);

      const hideButton = screen.getByText("Hide Editor");
      fireEvent.click(hideButton);

      expect(screen.queryByTestId("code-editor")).not.toBeInTheDocument();
    });

    it("should render test tools section", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText("Test Tools")).toBeInTheDocument();
    });

    it("should render tool selection dropdown", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText("Select Tool to Test")).toBeInTheDocument();
    });

    it("should display all tools in dropdown", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const select = screen.getByRole("combobox");
      expect(select).toBeInTheDocument();

      mockTools.forEach((tool) => {
        expect(screen.getByText(tool.name)).toBeInTheDocument();
      });
    });
  });

  describe("Tool Selection", () => {
    it("should select first tool by default", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe(mockTools[0].name);
    });

    it("should display tool description when tool is selected", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText(mockTools[0].description)).toBeInTheDocument();
    });

    it("should display tool schema when tool is selected", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText("Expected Parameters")).toBeInTheDocument();
    });

    it("should change tool when selection changes", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: mockTools[1].name } });

      expect(screen.getByText(mockTools[1].description)).toBeInTheDocument();
    });

    it("should update test input when tool changes", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: mockTools[1].name } });

      const textarea = screen.getByPlaceholderText(
        '{"key": "value"}'
      ) as HTMLTextAreaElement;
      const input = JSON.parse(textarea.value);

      // Should have example values from schema
      expect(input).toHaveProperty("name");
      expect(input).toHaveProperty("email");
    });

    it("should handle tools with no schema", () => {
      const toolsNoSchema = [
        {
          name: "simple_tool",
          description: "Simple tool",
          schema: {},
        },
      ];

      render(<CodePreview code={mockCode} tools={toolsNoSchema} />);
      expect(screen.getByText("Simple tool")).toBeInTheDocument();
    });
  });

  describe("Test Execution", () => {
    it("should have run test button", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);
      expect(screen.getByText("Run Test")).toBeInTheDocument();
    });

    it("should disable test button while testing", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(() => {
        const testingButton = screen.queryByText("Testing...");
        if (testingButton) {
          expect(testingButton).toBeDisabled();
        }
      });
    });

    it("should show testing state", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.queryByText("Testing...")).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });

    it("should display test results after execution", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText("Test Results")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show success message on successful test", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText("Test Passed")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should show test duration", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          const duration = screen.queryByText(/\d+ms/);
          expect(duration).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should handle test errors", async () => {
      const invalidCode = "invalid code";
      render(<CodePreview code={invalidCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText("Test Failed")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("should display error message on failed test", async () => {
      const invalidCode = "invalid code";
      render(<CodePreview code={invalidCode} tools={mockTools} />);

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          const errorSection = screen.getByText("Test Failed").closest("div");
          expect(errorSection).toBeTruthy();
        },
        { timeout: 3000 }
      );
    });

    it("should handle invalid JSON in test input", async () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const textarea = screen.getByPlaceholderText(
        '{"key": "value"}'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "invalid json" } });

      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      await waitFor(
        () => {
          expect(screen.getByText("Test Failed")).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("Code Editing", () => {
    it("should pass code to editor when shown", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      fireEvent.click(screen.getByText("Show Editor"));

      const editor = screen.getByTestId("code-editor");
      expect(editor).toBeInTheDocument();
    });

    it("should call onChange when code is edited", async () => {
      const handleChange = vi.fn();
      render(
        <CodePreview
          code={mockCode}
          tools={mockTools}
          onCodeChange={handleChange}
        />
      );

      fireEvent.click(screen.getByText("Show Editor"));

      const textarea = screen.getByTestId("editor-textarea");
      fireEvent.change(textarea, { target: { value: "new code" } });

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalledWith("new code");
      });
    });

    it("should support read-only mode", () => {
      render(<CodePreview code={mockCode} tools={mockTools} readOnly={true} />);

      fireEvent.click(screen.getByText("Show Editor"));

      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });

    it("should not show editing indicator in read-only mode", () => {
      render(<CodePreview code={mockCode} tools={mockTools} readOnly={true} />);

      fireEvent.click(screen.getByText("Show Editor"));

      expect(
        screen.queryByText("Editing enabled - changes will be saved")
      ).not.toBeInTheDocument();
    });

    it("should show editing indicator in editable mode", () => {
      render(<CodePreview code={mockCode} tools={mockTools} readOnly={false} />);

      fireEvent.click(screen.getByText("Show Editor"));

      expect(
        screen.getByText("Editing enabled - changes will be saved")
      ).toBeInTheDocument();
    });
  });

  describe("Test Input Management", () => {
    it("should allow editing test input", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const textarea = screen.getByPlaceholderText(
        '{"key": "value"}'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '{"test": "value"}' } });

      expect(textarea.value).toBe('{"test": "value"}');
    });

    it("should populate test input with example values", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      const textarea = screen.getByPlaceholderText(
        '{"key": "value"}'
      ) as HTMLTextAreaElement;
      const input = JSON.parse(textarea.value);

      expect(input.id).toBe("123"); // From schema example
    });

    it("should handle schema with different types", () => {
      const complexTools = [
        {
          name: "complex_tool",
          description: "Complex tool",
          schema: {
            type: "object",
            properties: {
              stringProp: { type: "string" },
              numberProp: { type: "number" },
              booleanProp: { type: "boolean" },
              nullProp: { type: "null" },
            },
          },
        },
      ];

      render(<CodePreview code={mockCode} tools={complexTools} />);

      const textarea = screen.getByPlaceholderText(
        '{"key": "value"}'
      ) as HTMLTextAreaElement;
      const input = JSON.parse(textarea.value);

      expect(input.stringProp).toBe("");
      expect(input.numberProp).toBe(0);
      expect(input.booleanProp).toBe(false);
      expect(input.nullProp).toBe(null);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty tools array", () => {
      render(<CodePreview code={mockCode} tools={[]} />);
      expect(screen.getByText("Test Tools")).toBeInTheDocument();
    });

    it("should handle empty code", () => {
      render(<CodePreview code="" tools={mockTools} />);
      expect(screen.getByText("Code Preview & Testing")).toBeInTheDocument();
    });

    it("should handle very long code", () => {
      const longCode = "const x = 1;\n".repeat(10000);
      render(<CodePreview code={longCode} tools={mockTools} />);

      fireEvent.click(screen.getByText("Show Editor"));
      expect(screen.getByTestId("code-editor")).toBeInTheDocument();
    });

    it("should handle special characters in tool names", () => {
      const specialTools = [
        {
          name: "test_tool_with_underscore",
          description: "Test",
          schema: {},
        },
      ];

      render(<CodePreview code={mockCode} tools={specialTools} />);
      expect(screen.getByText("test_tool_with_underscore")).toBeInTheDocument();
    });

    it("should clear test results when changing tools", () => {
      render(<CodePreview code={mockCode} tools={mockTools} />);

      // Run test
      const button = screen.getByText("Run Test");
      fireEvent.click(button);

      // Wait for results
      waitFor(() => {
        expect(screen.getByText("Test Results")).toBeInTheDocument();
      });

      // Change tool
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: mockTools[1].name } });

      // Results should be cleared
      expect(screen.queryByText("Test Results")).not.toBeInTheDocument();
    });
  });
});
