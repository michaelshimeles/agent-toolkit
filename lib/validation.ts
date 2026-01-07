/**
 * Input validation utilities
 * Provides validation functions for API endpoints
 */

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Validates that a value is a non-empty string
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}
): void {
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldName} must be a string`, fieldName);
  }

  if (value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }

  if (options.minLength && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters`,
      fieldName
    );
  }

  if (options.maxLength && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${options.maxLength} characters`,
      fieldName
    );
  }

  if (options.pattern && !options.pattern.test(value)) {
    throw new ValidationError(
      `${fieldName} has invalid format`,
      fieldName
    );
  }
}

/**
 * Validates that a value is a valid email address
 */
export function validateEmail(value: unknown, fieldName: string = "email"): void {
  validateString(value, fieldName);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value as string)) {
    throw new ValidationError(`${fieldName} must be a valid email address`, fieldName);
  }
}

/**
 * Validates that a value is a valid URL
 */
export function validateUrl(value: unknown, fieldName: string = "url"): void {
  validateString(value, fieldName);

  try {
    new URL(value as string);
  } catch {
    throw new ValidationError(`${fieldName} must be a valid URL`, fieldName);
  }
}

/**
 * Validates that a value is a number within a range
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): void {
  if (typeof value !== "number" || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`, fieldName);
  }

  if (options.integer && !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName);
  }

  if (options.min !== undefined && value < options.min) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.min}`,
      fieldName
    );
  }

  if (options.max !== undefined && value > options.max) {
    throw new ValidationError(
      `${fieldName} must be at most ${options.max}`,
      fieldName
    );
  }
}

/**
 * Validates that a value is a boolean
 */
export function validateBoolean(value: unknown, fieldName: string): void {
  if (typeof value !== "boolean") {
    throw new ValidationError(`${fieldName} must be a boolean`, fieldName);
  }
}

/**
 * Validates that a value is an array
 */
export function validateArray(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): void {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName);
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must have at least ${options.minLength} items`,
      fieldName
    );
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must have at most ${options.maxLength} items`,
      fieldName
    );
  }
}

/**
 * Validates that a value is an object
 */
export function validateObject(value: unknown, fieldName: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName);
  }
}

/**
 * Validates that a value is one of the allowed values
 */
export function validateEnum<T>(
  value: unknown,
  fieldName: string,
  allowedValues: T[]
): void {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(", ")}`,
      fieldName
    );
  }
}

/**
 * Validates that required fields are present in an object
 */
export function validateRequired(
  obj: Record<string, unknown>,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      throw new ValidationError(`${field} is required`, field);
    }
  }
}

/**
 * Validates an API key format
 */
export function validateApiKey(value: unknown, fieldName: string = "apiKey"): void {
  validateString(value, fieldName);

  if (!(value as string).startsWith("mcp_sk_")) {
    throw new ValidationError(
      `${fieldName} must start with 'mcp_sk_'`,
      fieldName
    );
  }

  if ((value as string).length < 40) {
    throw new ValidationError(
      `${fieldName} has invalid length`,
      fieldName
    );
  }
}

/**
 * Validates a tool name format (integration/tool_name)
 */
export function validateToolName(value: unknown, fieldName: string = "toolName"): void {
  validateString(value, fieldName);

  const parts = (value as string).split("/");
  if (parts.length !== 2) {
    throw new ValidationError(
      `${fieldName} must be in format 'integration/tool_name'`,
      fieldName
    );
  }

  const [integration, tool] = parts;
  if (!integration || !tool) {
    throw new ValidationError(
      `${fieldName} must be in format 'integration/tool_name'`,
      fieldName
    );
  }
}

/**
 * Validates multiple fields and collects all errors
 */
export function validateFields(
  validators: Array<() => void>
): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  for (const validator of validators) {
    try {
      validator();
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field || "unknown",
          message: error.message,
        });
      } else {
        throw error;
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitizes a string by trimming whitespace
 */
export function sanitizeString(value: string): string {
  return value.trim();
}

/**
 * Sanitizes an object by removing undefined values
 */
export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
