/**
 * Input Parsers for AI Builder
 * Supports Postman collections, cURL commands, plain text, and API Blueprint
 */

export interface ParsedEndpoint {
  path: string;
  method: string;
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  headers?: Record<string, string>;
}

export interface ParsedAPI {
  name: string;
  description: string;
  baseUrl?: string;
  endpoints: ParsedEndpoint[];
  schemas?: any;
}

/**
 * Parse Postman Collection (v2.1 format)
 */
export function parsePostmanCollection(collection: any): ParsedAPI {
  const name = collection.info?.name || "Postman API";
  const description = collection.info?.description || "API imported from Postman collection";

  // Extract base URL from variables or first request
  let baseUrl = "";
  if (collection.variable) {
    const baseUrlVar = collection.variable.find((v: any) =>
      v.key === "baseUrl" || v.key === "base_url" || v.key === "url"
    );
    if (baseUrlVar) {
      baseUrl = baseUrlVar.value;
    }
  }

  const endpoints: ParsedEndpoint[] = [];

  // Recursively extract requests from collection items
  function extractRequests(items: any[], folder: string = "") {
    items?.forEach((item: any) => {
      if (item.request) {
        // It's a request
        const request = item.request;
        const url = typeof request.url === "string" ? request.url : request.url?.raw || "";

        // Parse URL
        let path = url;
        if (url.startsWith("http")) {
          try {
            const urlObj = new URL(url);
            path = urlObj.pathname;
            if (!baseUrl && urlObj.origin) {
              baseUrl = urlObj.origin;
            }
          } catch {
            // Keep original path
          }
        }

        // Parse path variables
        path = path.replace(/{{([^}]+)}}/g, (_, key) => `:${key}`);

        // Extract headers
        const headers: Record<string, string> = {};
        request.header?.forEach((h: any) => {
          if (h.key && h.value) {
            headers[h.key] = h.value;
          }
        });

        // Extract query parameters
        const queryParams: any[] = [];
        if (typeof request.url === "object" && request.url?.query) {
          request.url.query.forEach((q: any) => {
            if (q.key) {
              queryParams.push({
                name: q.key,
                in: "query",
                description: q.description || "",
                required: !q.disabled,
                schema: { type: "string" },
              });
            }
          });
        }

        // Extract request body
        let requestBody;
        if (request.body) {
          if (request.body.mode === "raw") {
            try {
              const bodyData = JSON.parse(request.body.raw);
              requestBody = {
                content: {
                  "application/json": {
                    schema: { type: "object" },
                    example: bodyData,
                  },
                },
              };
            } catch {
              // Not JSON
              requestBody = {
                content: {
                  "text/plain": {
                    schema: { type: "string" },
                  },
                },
              };
            }
          } else if (request.body.mode === "formdata") {
            requestBody = {
              content: {
                "multipart/form-data": {
                  schema: { type: "object" },
                },
              },
            };
          }
        }

        endpoints.push({
          path,
          method: (request.method || "GET").toUpperCase(),
          operationId: item.name?.toLowerCase().replace(/\s+/g, "_"),
          summary: item.name || "",
          description: item.request?.description || "",
          parameters: queryParams,
          requestBody,
          headers,
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        });
      } else if (item.item) {
        // It's a folder
        const folderName = folder ? `${folder}/${item.name}` : item.name;
        extractRequests(item.item, folderName);
      }
    });
  }

  extractRequests(collection.item);

  return {
    name,
    description,
    baseUrl,
    endpoints,
  };
}

/**
 * Parse cURL command
 */
export function parseCurlCommand(curl: string): ParsedEndpoint {
  // Remove line breaks and extra spaces
  curl = curl.replace(/\\\n/g, " ").replace(/\s+/g, " ").trim();

  // Extract method
  const methodMatch = curl.match(/-X\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)/i);
  const method = methodMatch ? methodMatch[1].toUpperCase() : "GET";

  // Extract URL - try multiple patterns
  let url = "";

  // Pattern 1: URL after all flags
  const urlMatch1 = curl.match(/curl\s+(?:-[XH]\s+[^\s]+\s+)*['"]?(https?:\/\/[^\s'"]+)/);
  if (urlMatch1) {
    url = urlMatch1[1];
  }

  // Pattern 2: URL anywhere in the command
  if (!url) {
    const urlMatch2 = curl.match(/(https?:\/\/[^\s'"]+)/);
    if (urlMatch2) {
      url = urlMatch2[1];
    }
  }

  // Pattern 3: Simple path
  if (!url) {
    const urlMatch3 = curl.match(/curl\s+['"]?([^\s'"]+)/);
    if (urlMatch3) {
      url = urlMatch3[1];
    }
  }

  let path = url;
  let baseUrl = "";

  if (url.startsWith("http")) {
    try {
      const urlObj = new URL(url);
      path = urlObj.pathname + urlObj.search;
      baseUrl = urlObj.origin;
    } catch {
      // Keep original
    }
  }

  // Extract headers
  const headers: Record<string, string> = {};
  const headerRegex = /-H\s+['"]([^:]+):\s*([^'"]+)['"]/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(curl)) !== null) {
    headers[headerMatch[1]] = headerMatch[2];
  }

  // Extract request body
  let requestBody;
  const dataMatch = curl.match(/(?:--data|--data-raw|-d)\s+['"](.+?)['"]/);
  if (dataMatch) {
    try {
      const bodyData = JSON.parse(dataMatch[1]);
      requestBody = {
        content: {
          "application/json": {
            schema: { type: "object" },
            example: bodyData,
          },
        },
      };
    } catch {
      requestBody = {
        content: {
          "text/plain": {
            schema: { type: "string" },
            example: dataMatch[1],
          },
        },
      };
    }
  }

  return {
    path,
    method,
    summary: `${method} ${path}`,
    description: `Imported from cURL command`,
    headers,
    requestBody,
    responses: {
      "200": {
        description: "Successful response",
      },
    },
  };
}

/**
 * Parse multiple cURL commands
 */
export function parseCurlCommands(curls: string): ParsedAPI {
  // Split by 'curl' command
  const commands = curls.split(/\n(?=curl\s)/).filter((c) => c.trim());

  const endpoints = commands.map((cmd) => parseCurlCommand(cmd));

  return {
    name: "cURL Import",
    description: "API imported from cURL commands",
    endpoints,
  };
}

/**
 * Parse plain text API description
 */
export function parsePlainTextAPI(text: string): ParsedAPI {
  const endpoints: ParsedEndpoint[] = [];
  const lines = text.split("\n");

  // Common patterns for API descriptions
  const endpointPatterns = [
    // "GET /users - Get all users"
    /^(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s-]*)\s*-?\s*(.*)$/i,
    // "POST /api/users - Create user"
    /^(GET|POST|PUT|PATCH|DELETE)\s+(\/[^\s-]*)\s*:\s*(.*)$/i,
    // "GET /users: List users"
    /^(GET|POST|PUT|PATCH|DELETE)\s*:\s*(\/[^\s-]*)\s*-?\s*(.*)$/i,
  ];

  lines.forEach((line) => {
    line = line.trim();
    if (!line) return;

    for (const pattern of endpointPatterns) {
      const match = line.match(pattern);
      if (match) {
        const [, method, path, description] = match;
        endpoints.push({
          path: path.trim(),
          method: method.toUpperCase(),
          summary: description.trim() || `${method} ${path}`,
          description: description.trim(),
          responses: {
            "200": {
              description: "Successful response",
            },
          },
        });
        break;
      }
    }
  });

  // Try to extract API name and description
  let name = "Plain Text API";
  let description = "API imported from plain text description";

  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine && !endpointPatterns.some((p) => p.test(firstLine))) {
      name = firstLine;
      description = lines[1]?.trim() || description;
    }
  }

  return {
    name,
    description,
    endpoints,
  };
}

/**
 * Parse API Blueprint format
 */
export function parseAPIBlueprint(blueprint: string): ParsedAPI {
  const lines = blueprint.split("\n");
  let name = "API Blueprint";
  let description = "";
  let baseUrl = "";
  const endpoints: ParsedEndpoint[] = [];

  let currentEndpoint: ParsedEndpoint | null = null;
  let inRequestBody = false;
  let requestBodyLines: string[] = [];

  let foundName = false;
  let foundDescription = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Parse metadata
    if (trimmed.startsWith("# ") && !currentEndpoint && !foundName) {
      name = trimmed.substring(2).trim();
      foundName = true;
      continue;
    }

    // Parse description (first non-empty, non-heading line after title)
    if (
      trimmed &&
      foundName &&
      !foundDescription &&
      !currentEndpoint &&
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("+") &&
      !trimmed.startsWith("HOST:")
    ) {
      description = trimmed;
      foundDescription = true;
      continue;
    }

    // Parse HOST
    if (trimmed.startsWith("HOST:")) {
      baseUrl = trimmed.substring(5).trim();
      continue;
    }

    // Parse resource group
    if (trimmed.startsWith("## ") && !trimmed.includes("[")) {
      // Resource group header, skip
      continue;
    }

    // Parse action (endpoint) - support multiple formats
    // Format 1: ### Action [METHOD /path]
    // Format 2: ### Action [METHOD]
    const actionMatch = trimmed.match(/^###?\s+(.+?)\s+\[([A-Z]+)(?:\s+([^\]]+))?\]/);
    if (actionMatch) {
      // Save previous endpoint
      if (currentEndpoint) {
        endpoints.push(currentEndpoint);
      }

      const [, summary, method, pathFromMatch] = actionMatch;

      // If path not in brackets, it might be from parent resource
      let finalPath = pathFromMatch ? pathFromMatch.trim() : "";

      // Look back for resource group path
      if (!finalPath) {
        for (let j = i - 1; j >= 0; j--) {
          const prevLine = lines[j].trim();
          const resourceMatch = prevLine.match(/^##\s+[^[]+\[([^\]]+)\]/);
          if (resourceMatch) {
            finalPath = resourceMatch[1].trim();
            break;
          }
        }
      }

      currentEndpoint = {
        path: finalPath || "/",
        method: method.toUpperCase(),
        summary: summary.trim(),
        description: "",
        responses: {},
      };
      continue;
    }

    // Parse parameters
    if (trimmed.startsWith("+ Parameters") && currentEndpoint) {
      const params: any[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith("+")) {
        const paramLine = lines[j].trim();
        const paramMatch = paramLine.match(/\+\s+([^\s:]+)(?:\s*:\s*([^\s(]+))?.*-\s*(.*)/);
        if (paramMatch) {
          const [, paramName, paramType, paramDesc] = paramMatch;
          params.push({
            name: paramName,
            in: "path",
            description: paramDesc?.trim() || "",
            required: true,
            schema: { type: paramType?.toLowerCase() || "string" },
          });
        }
        j++;
      }
      currentEndpoint.parameters = params;
      i = j - 1;
      continue;
    }

    // Parse request body
    if (trimmed.startsWith("+ Request") && currentEndpoint) {
      inRequestBody = true;
      requestBodyLines = [];
      // Skip the Request line and look for body content
      let j = i + 1;
      while (j < lines.length && !lines[j].trim().startsWith("+ Response")) {
        const bodyLine = lines[j].trim();
        if (bodyLine && !bodyLine.startsWith("+")) {
          requestBodyLines.push(lines[j]);
        }
        j++;
      }
      i = j - 1;

      if (requestBodyLines.length > 0) {
        try {
          const bodyData = JSON.parse(requestBodyLines.join("\n"));
          currentEndpoint.requestBody = {
            content: {
              "application/json": {
                schema: { type: "object" },
                example: bodyData,
              },
            },
          };
        } catch {
          // Not valid JSON
        }
      }
      inRequestBody = false;
      requestBodyLines = [];
      continue;
    }

    // Parse response
    if (trimmed.startsWith("+ Response") && currentEndpoint) {
      const responseMatch = trimmed.match(/\+\s+Response\s+(\d+)/);
      if (responseMatch) {
        const statusCode = responseMatch[1];
        currentEndpoint.responses = currentEndpoint.responses || {};
        currentEndpoint.responses[statusCode] = {
          description: "Response",
        };
      }
      inRequestBody = false;
      requestBodyLines = [];
      continue;
    }

    // Collect request body content
    if (inRequestBody && trimmed && !trimmed.startsWith("+")) {
      requestBodyLines.push(line);
    }
  }

  // Add last endpoint
  if (currentEndpoint) {
    if (inRequestBody && requestBodyLines.length > 0) {
      try {
        const bodyData = JSON.parse(requestBodyLines.join("\n"));
        currentEndpoint.requestBody = {
          content: {
            "application/json": {
              schema: { type: "object" },
              example: bodyData,
            },
          },
        };
      } catch {
        // Not valid JSON
      }
    }
    endpoints.push(currentEndpoint);
  }

  return {
    name,
    description,
    baseUrl,
    endpoints,
  };
}

/**
 * Auto-detect input type and parse accordingly
 */
export function autoParseInput(input: string): ParsedAPI {
  const trimmed = input.trim();

  // Try JSON parsing (Postman collection)
  try {
    const json = JSON.parse(trimmed);
    if (json.info && json.item) {
      return parsePostmanCollection(json);
    }
  } catch {
    // Not JSON
  }

  // Check for cURL
  if (trimmed.startsWith("curl ")) {
    if (trimmed.includes("\ncurl ")) {
      return parseCurlCommands(trimmed);
    } else {
      const endpoint = parseCurlCommand(trimmed);
      return {
        name: "cURL Import",
        description: "API imported from cURL command",
        endpoints: [endpoint],
      };
    }
  }

  // Check for API Blueprint
  if (trimmed.includes("# ") && (trimmed.includes("[GET") || trimmed.includes("[POST"))) {
    return parseAPIBlueprint(trimmed);
  }

  // Default to plain text
  return parsePlainTextAPI(trimmed);
}

/**
 * Convert parsed API to OpenAPI spec
 */
export function toOpenAPISpec(parsed: ParsedAPI): any {
  const paths: any = {};

  parsed.endpoints.forEach((endpoint) => {
    const path = endpoint.path;
    const method = endpoint.method.toLowerCase();

    if (!paths[path]) {
      paths[path] = {};
    }

    paths[path][method] = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses || {
        "200": {
          description: "Successful response",
        },
      },
    };
  });

  return {
    openapi: "3.0.0",
    info: {
      title: parsed.name,
      description: parsed.description,
      version: "1.0.0",
    },
    servers: parsed.baseUrl
      ? [
          {
            url: parsed.baseUrl,
          },
        ]
      : [],
    paths,
    components: {
      schemas: parsed.schemas || {},
    },
  };
}
