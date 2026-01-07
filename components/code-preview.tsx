"use client";

import { useState } from "react";
import { CodeEditor } from "./code-editor";

export interface TestResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}

export interface ToolTest {
  toolName: string;
  arguments: Record<string, any>;
  expectedOutput?: any;
}

export interface CodePreviewProps {
  code: string;
  tools: Array<{ name: string; description: string; schema: any }>;
  onCodeChange?: (code: string) => void;
  readOnly?: boolean;
}

export function CodePreview({
  code,
  tools,
  onCodeChange,
  readOnly = false,
}: CodePreviewProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(
    tools.length > 0 ? tools[0].name : null
  );

  // Initialize test input with first tool's schema
  const getInitialInput = () => {
    if (tools.length === 0) return "{}";
    const schema = tools[0]?.schema;
    if (schema?.properties && Object.keys(schema.properties).length > 0) {
      const example: any = {};
      Object.keys(schema.properties).forEach((key) => {
        const prop = schema.properties[key];
        if (prop.example !== undefined) {
          example[key] = prop.example;
        } else if (prop.type === "string") {
          example[key] = "";
        } else if (prop.type === "number") {
          example[key] = 0;
        } else if (prop.type === "boolean") {
          example[key] = false;
        } else {
          example[key] = null;
        }
      });
      return JSON.stringify(example, null, 2);
    }
    return "{}";
  };

  const [testInput, setTestInput] = useState(getInitialInput());
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  const handleTest = async () => {
    if (!selectedTool) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // Parse test input
      const args = JSON.parse(testInput);

      // Start timing
      const startTime = performance.now();

      // Simulate tool execution (in production, this would call the actual MCP server)
      const result = await simulateToolExecution(selectedTool, args, code);

      const duration = performance.now() - startTime;

      setTestResult({
        success: true,
        output: JSON.stringify(result, null, 2),
        duration: Math.round(duration),
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message || "Test failed",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getToolSchema = (toolName: string) => {
    const tool = tools.find((t) => t.name === toolName);
    return tool?.schema || {};
  };

  return (
    <div className="space-y-6">
      {/* Code Editor Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Code Preview & Testing</h2>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {showEditor ? "Hide Editor" : "Show Editor"}
        </button>
      </div>

      {/* Monaco Editor (collapsible) */}
      {showEditor && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Source Code</h3>
            {!readOnly && (
              <div className="text-sm text-gray-600">
                Editing enabled - changes will be saved
              </div>
            )}
          </div>
          <CodeEditor
            value={code}
            onChange={onCodeChange}
            language="typescript"
            readOnly={readOnly}
            height="500px"
          />
        </div>
      )}

      {/* Tool Testing Interface */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Test Tools</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tool Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Tool to Test
            </label>
            <select
              value={selectedTool || ""}
              onChange={(e) => {
                setSelectedTool(e.target.value);
                setTestResult(null);
                // Set example input based on tool schema
                const schema = getToolSchema(e.target.value);
                if (schema.properties && Object.keys(schema.properties).length > 0) {
                  const example: any = {};
                  Object.keys(schema.properties).forEach((key) => {
                    const prop = schema.properties[key];
                    if (prop.example !== undefined) {
                      example[key] = prop.example;
                    } else if (prop.type === "string") {
                      example[key] = "";
                    } else if (prop.type === "number") {
                      example[key] = 0;
                    } else if (prop.type === "boolean") {
                      example[key] = false;
                    } else {
                      example[key] = null;
                    }
                  });
                  setTestInput(JSON.stringify(example, null, 2));
                } else {
                  setTestInput("{}");
                }
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {tools.map((tool) => (
                <option key={tool.name} value={tool.name}>
                  {tool.name}
                </option>
              ))}
            </select>

            {selectedTool && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-1">
                  Tool Description
                </div>
                <div className="text-sm text-gray-600">
                  {tools.find((t) => t.name === selectedTool)?.description}
                </div>

                <div className="text-sm font-medium text-gray-700 mt-3 mb-1">
                  Expected Parameters
                </div>
                <div className="bg-white p-2 rounded border text-xs">
                  <pre className="overflow-x-auto">
                    {JSON.stringify(getToolSchema(selectedTool), null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Test Input */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Test Arguments (JSON)
            </label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm h-64 focus:ring-2 focus:ring-blue-500"
              placeholder='{"key": "value"}'
            />

            <button
              onClick={handleTest}
              disabled={isTesting || !selectedTool}
              className="w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isTesting ? "Testing..." : "Run Test"}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Test Results</h4>
              {testResult.duration !== undefined && (
                <span className="text-sm text-gray-600">
                  {testResult.duration}ms
                </span>
              )}
            </div>

            {testResult.success ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-green-700">
                    Test Passed
                  </span>
                </div>
                <div className="bg-white p-3 rounded border border-green-200 mt-2">
                  <pre className="text-sm overflow-x-auto">
                    {testResult.output}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <svg
                    className="w-5 h-5 text-red-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold text-red-700">Test Failed</span>
                </div>
                <div className="bg-white p-3 rounded border border-red-200 mt-2">
                  <pre className="text-sm text-red-600">{testResult.error}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Simulate tool execution for testing
 * In production, this would make an actual HTTP request to the MCP server
 */
async function simulateToolExecution(
  toolName: string,
  args: Record<string, any>,
  code: string
): Promise<any> {
  // Simulate network delay (shorter for tests)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Basic simulation - in production, this would execute the actual code
  // For now, just validate that the code contains the tool
  if (!code.includes(toolName)) {
    throw new Error(`Tool "${toolName}" not found in code`);
  }

  // Validate required arguments
  const requiredArgs = extractRequiredArgs(code, toolName);
  for (const arg of requiredArgs) {
    if (args[arg] === undefined) {
      throw new Error(`Missing required argument: ${arg}`);
    }
  }

  // Return simulated success response
  return {
    success: true,
    data: {
      tool: toolName,
      arguments: args,
      result: "Simulated response - deploy to test with real data",
    },
  };
}

/**
 * Extract required arguments from code (basic parsing)
 */
function extractRequiredArgs(code: string, toolName: string): string[] {
  // This is a simplified version - in production, use proper AST parsing
  const toolSection = code.split(toolName)[1];
  if (!toolSection) return [];

  const required: string[] = [];
  const requiredMatch = toolSection.match(/required:\s*\[(.*?)\]/s);
  if (requiredMatch) {
    const items = requiredMatch[1].split(",");
    items.forEach((item) => {
      const cleaned = item.trim().replace(/['"]/g, "");
      if (cleaned) required.push(cleaned);
    });
  }

  return required;
}
