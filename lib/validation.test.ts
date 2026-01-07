import { describe, it, expect } from "vitest";
import {
  ValidationError,
  validateString,
  validateEmail,
  validateUrl,
  validateNumber,
  validateBoolean,
  validateArray,
  validateObject,
  validateEnum,
  validateRequired,
  validateApiKey,
  validateToolName,
  validateFields,
  sanitizeString,
  sanitizeObject,
} from "./validation";

describe("Validation", () => {
  describe("ValidationError", () => {
    it("should create validation error with message", () => {
      const error = new ValidationError("Test error");
      expect(error.message).toBe("Test error");
      expect(error.name).toBe("ValidationError");
    });

    it("should create validation error with field", () => {
      const error = new ValidationError("Test error", "testField");
      expect(error.field).toBe("testField");
    });
  });

  describe("validateString", () => {
    it("should validate valid string", () => {
      expect(() => validateString("hello", "test")).not.toThrow();
    });

    it("should reject non-string", () => {
      expect(() => validateString(123, "test")).toThrow("test must be a string");
    });

    it("should reject empty string", () => {
      expect(() => validateString("", "test")).toThrow("test cannot be empty");
    });

    it("should reject whitespace-only string", () => {
      expect(() => validateString("   ", "test")).toThrow("test cannot be empty");
    });

    it("should validate minimum length", () => {
      expect(() => validateString("hi", "test", { minLength: 5 })).toThrow(
        "test must be at least 5 characters"
      );
    });

    it("should validate maximum length", () => {
      expect(() => validateString("hello world", "test", { maxLength: 5 })).toThrow(
        "test must be at most 5 characters"
      );
    });

    it("should validate pattern", () => {
      expect(() =>
        validateString("abc", "test", { pattern: /^[0-9]+$/ })
      ).toThrow("test has invalid format");
    });

    it("should accept string matching pattern", () => {
      expect(() =>
        validateString("123", "test", { pattern: /^[0-9]+$/ })
      ).not.toThrow();
    });
  });

  describe("validateEmail", () => {
    it("should validate valid email", () => {
      expect(() => validateEmail("test@example.com")).not.toThrow();
    });

    it("should reject invalid email", () => {
      expect(() => validateEmail("not-an-email")).toThrow(
        "email must be a valid email address"
      );
    });

    it("should reject email without @", () => {
      expect(() => validateEmail("testeample.com")).toThrow(
        "email must be a valid email address"
      );
    });

    it("should reject email without domain", () => {
      expect(() => validateEmail("test@")).toThrow(
        "email must be a valid email address"
      );
    });

    it("should use custom field name", () => {
      expect(() => validateEmail("invalid", "userEmail")).toThrow("userEmail");
    });
  });

  describe("validateUrl", () => {
    it("should validate valid URL", () => {
      expect(() => validateUrl("https://example.com")).not.toThrow();
    });

    it("should validate URL with path", () => {
      expect(() => validateUrl("https://example.com/path")).not.toThrow();
    });

    it("should reject invalid URL", () => {
      expect(() => validateUrl("not-a-url")).toThrow("url must be a valid URL");
    });

    it("should reject URL without protocol", () => {
      expect(() => validateUrl("example.com")).toThrow("url must be a valid URL");
    });

    it("should use custom field name", () => {
      expect(() => validateUrl("invalid", "webhookUrl")).toThrow("webhookUrl");
    });
  });

  describe("validateNumber", () => {
    it("should validate valid number", () => {
      expect(() => validateNumber(42, "test")).not.toThrow();
    });

    it("should reject non-number", () => {
      expect(() => validateNumber("42", "test")).toThrow("test must be a number");
    });

    it("should reject NaN", () => {
      expect(() => validateNumber(NaN, "test")).toThrow("test must be a number");
    });

    it("should validate minimum value", () => {
      expect(() => validateNumber(5, "test", { min: 10 })).toThrow(
        "test must be at least 10"
      );
    });

    it("should validate maximum value", () => {
      expect(() => validateNumber(15, "test", { max: 10 })).toThrow(
        "test must be at most 10"
      );
    });

    it("should validate integer", () => {
      expect(() => validateNumber(3.14, "test", { integer: true })).toThrow(
        "test must be an integer"
      );
    });

    it("should accept integer when required", () => {
      expect(() => validateNumber(42, "test", { integer: true })).not.toThrow();
    });
  });

  describe("validateBoolean", () => {
    it("should validate true", () => {
      expect(() => validateBoolean(true, "test")).not.toThrow();
    });

    it("should validate false", () => {
      expect(() => validateBoolean(false, "test")).not.toThrow();
    });

    it("should reject non-boolean", () => {
      expect(() => validateBoolean("true", "test")).toThrow("test must be a boolean");
    });

    it("should reject number", () => {
      expect(() => validateBoolean(1, "test")).toThrow("test must be a boolean");
    });
  });

  describe("validateArray", () => {
    it("should validate valid array", () => {
      expect(() => validateArray([1, 2, 3], "test")).not.toThrow();
    });

    it("should validate empty array", () => {
      expect(() => validateArray([], "test")).not.toThrow();
    });

    it("should reject non-array", () => {
      expect(() => validateArray("not an array", "test")).toThrow(
        "test must be an array"
      );
    });

    it("should reject object", () => {
      expect(() => validateArray({}, "test")).toThrow("test must be an array");
    });

    it("should validate minimum length", () => {
      expect(() => validateArray([1, 2], "test", { minLength: 3 })).toThrow(
        "test must have at least 3 items"
      );
    });

    it("should validate maximum length", () => {
      expect(() => validateArray([1, 2, 3, 4], "test", { maxLength: 3 })).toThrow(
        "test must have at most 3 items"
      );
    });
  });

  describe("validateObject", () => {
    it("should validate valid object", () => {
      expect(() => validateObject({ key: "value" }, "test")).not.toThrow();
    });

    it("should validate empty object", () => {
      expect(() => validateObject({}, "test")).not.toThrow();
    });

    it("should reject array", () => {
      expect(() => validateObject([], "test")).toThrow("test must be an object");
    });

    it("should reject null", () => {
      expect(() => validateObject(null, "test")).toThrow("test must be an object");
    });

    it("should reject string", () => {
      expect(() => validateObject("not an object", "test")).toThrow(
        "test must be an object"
      );
    });
  });

  describe("validateEnum", () => {
    it("should validate value in enum", () => {
      expect(() => validateEnum("a", "test", ["a", "b", "c"])).not.toThrow();
    });

    it("should reject value not in enum", () => {
      expect(() => validateEnum("d", "test", ["a", "b", "c"])).toThrow(
        "test must be one of: a, b, c"
      );
    });

    it("should work with numbers", () => {
      expect(() => validateEnum(2, "test", [1, 2, 3])).not.toThrow();
    });

    it("should reject number not in enum", () => {
      expect(() => validateEnum(4, "test", [1, 2, 3])).toThrow(
        "test must be one of: 1, 2, 3"
      );
    });
  });

  describe("validateRequired", () => {
    it("should validate all required fields present", () => {
      const obj = { name: "test", email: "test@example.com" };
      expect(() => validateRequired(obj, ["name", "email"])).not.toThrow();
    });

    it("should reject missing field", () => {
      const obj = { name: "test" };
      expect(() => validateRequired(obj, ["name", "email"])).toThrow(
        "email is required"
      );
    });

    it("should reject undefined field", () => {
      const obj = { name: "test", email: undefined };
      expect(() => validateRequired(obj, ["name", "email"])).toThrow(
        "email is required"
      );
    });

    it("should reject null field", () => {
      const obj = { name: "test", email: null };
      expect(() => validateRequired(obj, ["name", "email"])).toThrow(
        "email is required"
      );
    });

    it("should accept empty string", () => {
      const obj = { name: "" };
      expect(() => validateRequired(obj, ["name"])).not.toThrow();
    });
  });

  describe("validateApiKey", () => {
    it("should validate valid API key", () => {
      expect(() => validateApiKey("mcp_sk_1234567890abcdef1234567890abcdef123456")).not.toThrow();
    });

    it("should reject key without prefix", () => {
      expect(() => validateApiKey("1234567890abcdef")).toThrow(
        "apiKey must start with 'mcp_sk_'"
      );
    });

    it("should reject key too short", () => {
      expect(() => validateApiKey("mcp_sk_123")).toThrow(
        "apiKey has invalid length"
      );
    });

    it("should use custom field name", () => {
      expect(() => validateApiKey("invalid", "token")).toThrow("token");
    });
  });

  describe("validateToolName", () => {
    it("should validate valid tool name", () => {
      expect(() => validateToolName("github/create_issue")).not.toThrow();
    });

    it("should reject name without slash", () => {
      expect(() => validateToolName("create_issue")).toThrow(
        "toolName must be in format 'integration/tool_name'"
      );
    });

    it("should reject name with multiple slashes", () => {
      expect(() => validateToolName("github/issues/create")).toThrow(
        "toolName must be in format 'integration/tool_name'"
      );
    });

    it("should reject name with empty integration", () => {
      expect(() => validateToolName("/create_issue")).toThrow(
        "toolName must be in format 'integration/tool_name'"
      );
    });

    it("should reject name with empty tool", () => {
      expect(() => validateToolName("github/")).toThrow(
        "toolName must be in format 'integration/tool_name'"
      );
    });

    it("should use custom field name", () => {
      expect(() => validateToolName("invalid", "tool")).toThrow("tool");
    });
  });

  describe("validateFields", () => {
    it("should return valid when all validators pass", () => {
      const result = validateFields([
        () => validateString("hello", "name"),
        () => validateNumber(42, "age"),
      ]);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should collect all validation errors", () => {
      const result = validateFields([
        () => validateString(123, "name"),
        () => validateNumber("not a number", "age"),
      ]);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it("should include field names in errors", () => {
      const result = validateFields([
        () => validateString(123, "name"),
      ]);

      expect(result.errors[0].field).toBe("name");
    });

    it("should include error messages", () => {
      const result = validateFields([
        () => validateString(123, "name"),
      ]);

      expect(result.errors[0].message).toContain("name must be a string");
    });

    it("should continue validation after errors", () => {
      const result = validateFields([
        () => validateString(123, "field1"),
        () => validateString(456, "field2"),
        () => validateString(789, "field3"),
      ]);

      expect(result.errors).toHaveLength(3);
    });
  });

  describe("sanitizeString", () => {
    it("should trim whitespace", () => {
      expect(sanitizeString("  hello  ")).toBe("hello");
    });

    it("should trim leading whitespace", () => {
      expect(sanitizeString("  hello")).toBe("hello");
    });

    it("should trim trailing whitespace", () => {
      expect(sanitizeString("hello  ")).toBe("hello");
    });

    it("should handle empty string", () => {
      expect(sanitizeString("")).toBe("");
    });

    it("should handle whitespace-only string", () => {
      expect(sanitizeString("   ")).toBe("");
    });
  });

  describe("sanitizeObject", () => {
    it("should remove undefined values", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = sanitizeObject(obj);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should keep null values", () => {
      const obj = { a: 1, b: null, c: 3 };
      const result = sanitizeObject(obj);

      expect(result).toEqual({ a: 1, b: null, c: 3 });
    });

    it("should keep empty string", () => {
      const obj = { a: "", b: undefined };
      const result = sanitizeObject(obj);

      expect(result).toEqual({ a: "" });
    });

    it("should keep zero", () => {
      const obj = { a: 0, b: undefined };
      const result = sanitizeObject(obj);

      expect(result).toEqual({ a: 0 });
    });

    it("should keep false", () => {
      const obj = { a: false, b: undefined };
      const result = sanitizeObject(obj);

      expect(result).toEqual({ a: false });
    });

    it("should handle empty object", () => {
      const result = sanitizeObject({});
      expect(result).toEqual({});
    });
  });
});
