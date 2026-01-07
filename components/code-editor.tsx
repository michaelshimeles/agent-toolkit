"use client";

import { useEffect, useRef, useState } from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  theme?: "vs-dark" | "light";
}

export function CodeEditor({
  value,
  onChange,
  language = "typescript",
  readOnly = false,
  height = "600px",
  theme = "vs-dark",
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  function handleEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Configure Monaco editor options
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: "on",
      rulers: [80],
      wordWrap: "on",
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      readOnly,
    });

    // Add TypeScript/JavaScript library suggestions
    if (language === "typescript" || language === "javascript") {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: "React",
        allowJs: true,
        typeRoots: ["node_modules/@types"],
      });

      // Add common library types
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    }
  }

  function handleEditorChange(value: string | undefined) {
    if (onChange && value !== undefined) {
      onChange(value);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
        }}
        loading={
          <div className="flex items-center justify-center h-full bg-gray-900 text-gray-300">
            <div className="text-center">
              <div className="text-lg mb-2">Loading Editor...</div>
              <div className="text-sm text-gray-500">Initializing Monaco</div>
            </div>
          </div>
        }
      />
    </div>
  );
}

// Helper function to format code
export async function formatCode(
  code: string,
  language: string
): Promise<string> {
  // This would use prettier or similar in production
  // For now, just return the code as-is
  return code;
}

// Helper function to validate code syntax
export function validateCode(code: string, language: string): {
  valid: boolean;
  errors: Array<{ line: number; message: string }>;
} {
  const errors: Array<{ line: number; message: string }> = [];

  try {
    if (language === "typescript" || language === "javascript") {
      // Basic validation - check for common syntax errors
      const lines = code.split("\n");

      // Check for unclosed brackets
      let braceCount = 0;
      let bracketCount = 0;
      let parenCount = 0;

      lines.forEach((line, index) => {
        for (const char of line) {
          if (char === "{") braceCount++;
          if (char === "}") braceCount--;
          if (char === "[") bracketCount++;
          if (char === "]") bracketCount--;
          if (char === "(") parenCount++;
          if (char === ")") parenCount--;
        }

        // Check for negative counts (closing before opening)
        if (braceCount < 0) {
          errors.push({
            line: index + 1,
            message: "Unexpected closing brace",
          });
        }
        if (bracketCount < 0) {
          errors.push({
            line: index + 1,
            message: "Unexpected closing bracket",
          });
        }
        if (parenCount < 0) {
          errors.push({
            line: index + 1,
            message: "Unexpected closing parenthesis",
          });
        }
      });

      // Check for unclosed brackets at end
      if (braceCount > 0) {
        errors.push({
          line: lines.length,
          message: `Missing ${braceCount} closing brace(s)`,
        });
      }
      if (bracketCount > 0) {
        errors.push({
          line: lines.length,
          message: `Missing ${bracketCount} closing bracket(s)`,
        });
      }
      if (parenCount > 0) {
        errors.push({
          line: lines.length,
          message: `Missing ${parenCount} closing parenthesis(es)`,
        });
      }
    }
  } catch (error) {
    errors.push({
      line: 1,
      message: "Unable to parse code",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
