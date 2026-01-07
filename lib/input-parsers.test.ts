/**
 * Tests for Input Parsers
 */

import { describe, it, expect } from "vitest";
import {
  parsePostmanCollection,
  parseCurlCommand,
  parseCurlCommands,
  parsePlainTextAPI,
  parseAPIBlueprint,
  autoParseInput,
  toOpenAPISpec,
} from "./input-parsers";

describe("Input Parsers", () => {
  describe("Postman Collection Parser", () => {
    it("should parse basic Postman collection", () => {
      const collection = {
        info: {
          name: "My API",
          description: "Test API",
        },
        item: [
          {
            name: "Get Users",
            request: {
              method: "GET",
              url: "https://api.example.com/users",
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.name).toBe("My API");
      expect(result.description).toBe("Test API");
      expect(result.endpoints.length).toBe(1);
      expect(result.endpoints[0].method).toBe("GET");
      expect(result.endpoints[0].path).toBe("/users");
    });

    it("should extract base URL from collection", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Test",
            request: {
              method: "GET",
              url: "https://api.example.com/test",
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.baseUrl).toBe("https://api.example.com");
    });

    it("should handle nested folders", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Users",
            item: [
              {
                name: "Get User",
                request: {
                  method: "GET",
                  url: "/users/:id",
                },
              },
              {
                name: "Create User",
                request: {
                  method: "POST",
                  url: "/users",
                },
              },
            ],
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints.length).toBe(2);
      expect(result.endpoints[0].method).toBe("GET");
      expect(result.endpoints[1].method).toBe("POST");
    });

    it("should parse query parameters", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Search",
            request: {
              method: "GET",
              url: {
                raw: "https://api.example.com/search",
                query: [
                  {
                    key: "q",
                    value: "test",
                    description: "Search query",
                  },
                  {
                    key: "limit",
                    value: "10",
                  },
                ],
              },
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints[0].parameters).toBeDefined();
      expect(result.endpoints[0].parameters?.length).toBe(2);
      expect(result.endpoints[0].parameters?.[0].name).toBe("q");
    });

    it("should parse request body", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Create",
            request: {
              method: "POST",
              url: "/users",
              body: {
                mode: "raw",
                raw: JSON.stringify({ name: "John", email: "john@example.com" }),
              },
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints[0].requestBody).toBeDefined();
      expect(result.endpoints[0].requestBody?.content).toBeDefined();
    });

    it("should parse headers", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Test",
            request: {
              method: "GET",
              url: "/test",
              header: [
                { key: "Authorization", value: "Bearer token" },
                { key: "Content-Type", value: "application/json" },
              ],
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints[0].headers).toBeDefined();
      expect(result.endpoints[0].headers?.Authorization).toBe("Bearer token");
    });

    it("should handle collection without endpoints", () => {
      const collection = {
        info: { name: "Empty" },
        item: [],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints.length).toBe(0);
    });

    it("should replace path variables", () => {
      const collection = {
        info: { name: "API" },
        item: [
          {
            name: "Get User",
            request: {
              method: "GET",
              url: "/users/{{userId}}",
            },
          },
        ],
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints[0].path).toBe("/users/:userId");
    });
  });

  describe("cURL Command Parser", () => {
    it("should parse basic GET request", () => {
      const curl = 'curl https://api.example.com/users';
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("GET");
      expect(result.path).toBe("/users");
    });

    it("should parse POST request with data", () => {
      const curl = `curl -X POST https://api.example.com/users -H "Content-Type: application/json" -d '{"name":"John"}'`;
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("POST");
      expect(result.path).toBe("/users");
      expect(result.requestBody).toBeDefined();
    });

    it("should parse headers", () => {
      const curl = `curl -H "Authorization: Bearer token" -H "Accept: application/json" https://api.example.com/test`;
      const result = parseCurlCommand(curl);

      expect(result.headers?.Authorization).toBe("Bearer token");
      expect(result.headers?.Accept).toBe("application/json");
    });

    it("should handle multiline cURL commands", () => {
      const curl = `curl -X POST \\\n  https://api.example.com/users \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"Test"}'`;
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("POST");
      expect(result.path).toBe("/users");
    });

    it("should parse PUT request", () => {
      const curl = 'curl -X PUT https://api.example.com/users/1';
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("PUT");
    });

    it("should parse DELETE request", () => {
      const curl = 'curl -X DELETE https://api.example.com/users/1';
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("DELETE");
    });

    it("should handle --data flag", () => {
      const curl = `curl -X POST https://api.example.com/test --data '{"test":true}'`;
      const result = parseCurlCommand(curl);

      expect(result.requestBody).toBeDefined();
    });

    it("should handle --data-raw flag", () => {
      const curl = `curl -X POST https://api.example.com/test --data-raw 'plain text'`;
      const result = parseCurlCommand(curl);

      expect(result.requestBody).toBeDefined();
    });
  });

  describe("Multiple cURL Commands Parser", () => {
    it("should parse multiple cURL commands", () => {
      const curls = `curl https://api.example.com/users
curl -X POST https://api.example.com/users -d '{"name":"Test"}'
curl -X DELETE https://api.example.com/users/1`;

      const result = parseCurlCommands(curls);

      expect(result.endpoints.length).toBe(3);
      expect(result.endpoints[0].method).toBe("GET");
      expect(result.endpoints[1].method).toBe("POST");
      expect(result.endpoints[2].method).toBe("DELETE");
    });

    it("should handle single cURL command", () => {
      const curl = 'curl https://api.example.com/test';
      const result = parseCurlCommands(curl);

      expect(result.endpoints.length).toBe(1);
    });
  });

  describe("Plain Text API Parser", () => {
    it("should parse simple endpoint list", () => {
      const text = `GET /users - Get all users
POST /users - Create a user
DELETE /users/:id - Delete a user`;

      const result = parsePlainTextAPI(text);

      expect(result.endpoints.length).toBe(3);
      expect(result.endpoints[0].method).toBe("GET");
      expect(result.endpoints[0].path).toBe("/users");
      expect(result.endpoints[0].summary).toContain("Get all users");
    });

    it("should parse endpoints with colons", () => {
      const text = `GET /users: List all users
POST /users: Create user`;

      const result = parsePlainTextAPI(text);

      expect(result.endpoints.length).toBe(2);
    });

    it("should extract API name from first line", () => {
      const text = `My Amazing API
This is a description
GET /test - Test endpoint`;

      const result = parsePlainTextAPI(text);

      expect(result.name).toBe("My Amazing API");
      expect(result.description).toBe("This is a description");
    });

    it("should handle empty lines", () => {
      const text = `GET /users - List users

POST /users - Create user

DELETE /users/:id - Delete user`;

      const result = parsePlainTextAPI(text);

      expect(result.endpoints.length).toBe(3);
    });

    it("should support different HTTP methods", () => {
      const text = `GET /test
POST /test
PUT /test
PATCH /test
DELETE /test`;

      const result = parsePlainTextAPI(text);

      expect(result.endpoints.length).toBe(5);
      expect(result.endpoints.map((e) => e.method)).toEqual([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
      ]);
    });
  });

  describe("API Blueprint Parser", () => {
    it("should parse basic API Blueprint", () => {
      const blueprint = `# My API
This is my API

## Users [/users]

### Get Users [GET]
+ Response 200

### Create User [POST /users]
+ Response 201`;

      const result = parseAPIBlueprint(blueprint);

      expect(result.name).toBe("My API");
      expect(result.description).toBe("This is my API");
      expect(result.endpoints.length).toBe(2);
    });

    it("should parse parameters", () => {
      const blueprint = `# API

### Get User [GET /users/{id}]
+ Parameters
    + id: 1 (number) - User ID

+ Response 200`;

      const result = parseAPIBlueprint(blueprint);

      expect(result.endpoints[0].parameters).toBeDefined();
      expect(result.endpoints[0].parameters?.length).toBe(1);
      expect(result.endpoints[0].parameters?.[0].name).toBe("id");
    });

    it("should parse request body", () => {
      const blueprint = `# API

### Create User [POST /users]
+ Request (application/json)
    {
        "name": "John",
        "email": "john@example.com"
    }

+ Response 201`;

      const result = parseAPIBlueprint(blueprint);

      expect(result.endpoints[0].requestBody).toBeDefined();
    });

    it("should parse HOST directive", () => {
      const blueprint = `# API
HOST: https://api.example.com

### Test [GET /test]
+ Response 200`;

      const result = parseAPIBlueprint(blueprint);

      expect(result.baseUrl).toBe("https://api.example.com");
    });

    it("should parse multiple responses", () => {
      const blueprint = `# API

### Get User [GET /users/{id}]
+ Response 200
+ Response 404`;

      const result = parseAPIBlueprint(blueprint);

      expect(result.endpoints[0].responses).toBeDefined();
      expect(result.endpoints[0].responses?.["200"]).toBeDefined();
      expect(result.endpoints[0].responses?.["404"]).toBeDefined();
    });
  });

  describe("Auto Parse Input", () => {
    it("should detect Postman collection", () => {
      const input = JSON.stringify({
        info: { name: "API" },
        item: [
          {
            name: "Test",
            request: {
              method: "GET",
              url: "/test",
            },
          },
        ],
      });

      const result = autoParseInput(input);

      expect(result.name).toBe("API");
      expect(result.endpoints.length).toBe(1);
    });

    it("should detect cURL command", () => {
      const input = 'curl https://api.example.com/test';
      const result = autoParseInput(input);

      expect(result.endpoints.length).toBe(1);
      expect(result.endpoints[0].method).toBe("GET");
    });

    it("should detect API Blueprint", () => {
      const input = `# My API
### Get Test [GET /test]
+ Response 200`;

      const result = autoParseInput(input);

      expect(result.name).toBe("My API");
      expect(result.endpoints.length).toBe(1);
    });

    it("should default to plain text", () => {
      const input = `GET /users - List users
POST /users - Create user`;

      const result = autoParseInput(input);

      expect(result.endpoints.length).toBe(2);
    });

    it("should detect multiple cURL commands", () => {
      const input = `curl https://api.example.com/users
curl -X POST https://api.example.com/users`;

      const result = autoParseInput(input);

      expect(result.endpoints.length).toBe(2);
    });
  });

  describe("OpenAPI Spec Converter", () => {
    it("should convert to OpenAPI spec", () => {
      const parsed = {
        name: "Test API",
        description: "API for testing",
        baseUrl: "https://api.example.com",
        endpoints: [
          {
            path: "/users",
            method: "GET",
            summary: "Get users",
            description: "Retrieve all users",
            responses: {
              "200": {
                description: "Success",
              },
            },
          },
        ],
      };

      const spec = toOpenAPISpec(parsed);

      expect(spec.openapi).toBe("3.0.0");
      expect(spec.info.title).toBe("Test API");
      expect(spec.servers[0].url).toBe("https://api.example.com");
      expect(spec.paths["/users"]).toBeDefined();
      expect(spec.paths["/users"].get).toBeDefined();
    });

    it("should handle multiple endpoints on same path", () => {
      const parsed = {
        name: "API",
        description: "Test",
        endpoints: [
          {
            path: "/users",
            method: "GET",
            summary: "Get users",
          },
          {
            path: "/users",
            method: "POST",
            summary: "Create user",
          },
        ],
      };

      const spec = toOpenAPISpec(parsed);

      expect(spec.paths["/users"].get).toBeDefined();
      expect(spec.paths["/users"].post).toBeDefined();
    });

    it("should include request body in spec", () => {
      const parsed = {
        name: "API",
        description: "Test",
        endpoints: [
          {
            path: "/users",
            method: "POST",
            summary: "Create user",
            requestBody: {
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        ],
      };

      const spec = toOpenAPISpec(parsed);

      expect(spec.paths["/users"].post.requestBody).toBeDefined();
    });

    it("should include parameters in spec", () => {
      const parsed = {
        name: "API",
        description: "Test",
        endpoints: [
          {
            path: "/users/{id}",
            method: "GET",
            summary: "Get user",
            parameters: [
              {
                name: "id",
                in: "path",
                required: true,
                schema: { type: "string" },
              },
            ],
          },
        ],
      };

      const spec = toOpenAPISpec(parsed);

      expect(spec.paths["/users/{id}"].get.parameters).toBeDefined();
      expect(spec.paths["/users/{id}"].get.parameters.length).toBe(1);
    });

    it("should handle empty endpoints", () => {
      const parsed = {
        name: "API",
        description: "Test",
        endpoints: [],
      };

      const spec = toOpenAPISpec(parsed);

      expect(spec.paths).toEqual({});
    });
  });

  describe("Edge Cases", () => {
    it("should handle malformed Postman collection", () => {
      const collection = {
        info: { name: "Test" },
        // Missing item array
      };

      const result = parsePostmanCollection(collection);

      expect(result.endpoints.length).toBe(0);
    });

    it("should handle malformed cURL", () => {
      const curl = "not a curl command";
      const result = parseCurlCommand(curl);

      expect(result.method).toBe("GET");
    });

    it("should handle empty plain text", () => {
      const text = "";
      const result = parsePlainTextAPI(text);

      expect(result.endpoints.length).toBe(0);
    });

    it("should handle empty API Blueprint", () => {
      const blueprint = "# API";
      const result = parseAPIBlueprint(blueprint);

      expect(result.endpoints.length).toBe(0);
    });

    it("should handle invalid JSON in auto parse", () => {
      const input = "{invalid json";
      const result = autoParseInput(input);

      // Should default to plain text
      expect(result).toBeDefined();
    });
  });
});
