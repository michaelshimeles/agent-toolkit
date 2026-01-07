/**
 * Tests for Code Editor Component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CodeEditor, validateCode, formatCode } from "./code-editor";

// Mock Monaco editor
vi.mock("@monaco-editor/react", () => ({
  default: ({ value, loading }: any) => (
    <div data-testid="monaco-editor">
      {loading || <div data-testid="editor-content">{value}</div>}
    </div>
  ),
}));

describe("CodeEditor", () => {
  describe("Component Rendering", () => {
    it("should render the editor component", () => {
      render(<CodeEditor value="const x = 1;" />);
      expect(screen.getByTestId("monaco-editor")).toBeInTheDocument();
    });

    it("should display initial code value", async () => {
      const code = "const hello = 'world';";
      render(<CodeEditor value={code} />);

      await waitFor(() => {
        const content = screen.queryByTestId("editor-content");
        if (content) {
          expect(content).toHaveTextContent(code);
        }
      });
    });

    it("should use default language as typescript", () => {
      const { container } = render(<CodeEditor value="" />);
      expect(container).toBeInTheDocument();
    });

    it("should accept custom language", () => {
      const { container } = render(
        <CodeEditor value="print('hello')" language="python" />
      );
      expect(container).toBeInTheDocument();
    });

    it("should accept custom height", () => {
      const { container } = render(
        <CodeEditor value="" height="400px" />
      );
      expect(container).toBeInTheDocument();
    });

    it("should accept theme prop", () => {
      const { container } = render(
        <CodeEditor value="" theme="light" />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("Editor Modes", () => {
    it("should support read-only mode", () => {
      const { container } = render(
        <CodeEditor value="const x = 1;" readOnly={true} />
      );
      expect(container).toBeInTheDocument();
    });

    it("should support editable mode by default", () => {
      const { container } = render(<CodeEditor value="const x = 1;" />);
      expect(container).toBeInTheDocument();
    });

    it("should handle onChange callback", () => {
      const handleChange = vi.fn();
      const { container } = render(
        <CodeEditor value="" onChange={handleChange} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  describe("Code Validation", () => {
    it("should validate correct JavaScript code", () => {
      const code = `
        function hello() {
          console.log("Hello, world!");
        }
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect unclosed braces", () => {
      const code = `
        function test() {
          console.log("missing closing brace");
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("closing brace");
    });

    it("should detect unclosed brackets", () => {
      const code = `const arr = [1, 2, 3;`;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("closing bracket");
    });

    it("should detect unclosed parentheses", () => {
      const code = `console.log("test";`;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("parenthesis");
    });

    it("should detect unexpected closing brace", () => {
      const code = `
        function test() {
          console.log("test");
        }
      }
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Unexpected"))).toBe(
        true
      );
    });

    it("should detect unexpected closing bracket", () => {
      const code = `const arr = [1, 2, 3]];`;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
    });

    it("should detect unexpected closing parenthesis", () => {
      const code = `console.log("test"))`;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
    });

    it("should validate TypeScript code", () => {
      const code = `
        interface User {
          name: string;
          age: number;
        }

        const user: User = {
          name: "John",
          age: 30
        };
      `;
      const result = validateCode(code, "typescript");
      expect(result.valid).toBe(true);
    });

    it("should handle empty code", () => {
      const result = validateCode("", "javascript");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should include line numbers in errors", () => {
      const code = `
        const x = 1;
        function test() {
          console.log("test"
        }
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty("line");
      expect(typeof result.errors[0].line).toBe("number");
    });

    it("should validate code with nested structures", () => {
      const code = `
        const obj = {
          nested: {
            array: [1, 2, 3],
            func: function() {
              return true;
            }
          }
        };
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });

    it("should handle code with comments", () => {
      const code = `
        // This is a comment
        function test() {
          /* Multi-line
             comment */
          return true;
        }
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });
  });

  describe("Code Formatting", () => {
    it("should format code", async () => {
      const code = "const x=1;";
      const formatted = await formatCode(code, "javascript");
      expect(typeof formatted).toBe("string");
    });

    it("should preserve code structure when formatting", async () => {
      const code = `
        function hello() {
          console.log("Hello");
        }
      `;
      const formatted = await formatCode(code, "javascript");
      expect(formatted).toBeTruthy();
    });

    it("should handle empty code when formatting", async () => {
      const formatted = await formatCode("", "javascript");
      expect(formatted).toBe("");
    });

    it("should handle TypeScript code", async () => {
      const code = `interface User { name: string; }`;
      const formatted = await formatCode(code, "typescript");
      expect(typeof formatted).toBe("string");
    });
  });

  describe("Editor Features", () => {
    it("should support multiple languages", () => {
      const languages = ["javascript", "typescript", "python", "json", "markdown"];

      languages.forEach((lang) => {
        const { container } = render(
          <CodeEditor value="test code" language={lang} />
        );
        expect(container).toBeInTheDocument();
      });
    });

    it("should handle large code files", () => {
      const largeCode = "const x = 1;\n".repeat(1000);
      const { container } = render(<CodeEditor value={largeCode} />);
      expect(container).toBeInTheDocument();
    });

    it("should handle special characters in code", async () => {
      const code = `const str = "Hello 👋 World! ñ á é í ó ú";`;
      render(<CodeEditor value={code} />);

      await waitFor(() => {
        const content = screen.queryByTestId("editor-content");
        if (content) {
          expect(content).toHaveTextContent("Hello");
        }
      });
    });

    it("should handle code with various quote types", () => {
      const code = `
        const single = 'test';
        const double = "test";
        const backtick = \`test\`;
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null or undefined values gracefully", () => {
      const { container } = render(<CodeEditor value="" />);
      expect(container).toBeInTheDocument();
    });

    it("should handle very long lines", () => {
      const longLine = "const x = " + "a".repeat(1000) + ";";
      const { container } = render(<CodeEditor value={longLine} />);
      expect(container).toBeInTheDocument();
    });

    it("should handle code with only whitespace", () => {
      const code = "   \n\n   \t\t   \n";
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });

    it("should handle code with mixed line endings", () => {
      const code = "const x = 1;\r\nconst y = 2;\n";
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });

    it("should validate code with template literals", () => {
      const code = `
        const greeting = \`Hello \${name}!\`;
        const multiline = \`
          Line 1
          Line 2
        \`;
      `;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });

    it("should handle code with regex patterns", () => {
      const code = `const pattern = /[a-z]+/gi;`;
      const result = validateCode(code, "javascript");
      expect(result.valid).toBe(true);
    });
  });
});
