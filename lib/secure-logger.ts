/**
 * Secure Logger - Redacts sensitive information from error messages before logging
 */

const SENSITIVE_PATTERNS = [
  // API keys and tokens
  { pattern: /Bearer\s+[A-Za-z0-9\-_=]+/gi, replacement: 'Bearer [REDACTED]' },
  { pattern: /api[_-]?key[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi, replacement: 'api_key=[REDACTED]' },
  { pattern: /sk[_-][A-Za-z0-9\-_]{20,}/g, replacement: '[REDACTED_SECRET_KEY]' },
  { pattern: /mcp_sk_[A-Za-z0-9]+/g, replacement: '[REDACTED_MCP_KEY]' },

  // OAuth tokens
  { pattern: /access[_-]?token[=:]\s*["']?[A-Za-z0-9\-_.]+["']?/gi, replacement: 'access_token=[REDACTED]' },
  { pattern: /refresh[_-]?token[=:]\s*["']?[A-Za-z0-9\-_.]+["']?/gi, replacement: 'refresh_token=[REDACTED]' },

  // Clerk tokens
  { pattern: /clerk[_-]?secret[=:]\s*["']?[A-Za-z0-9\-_]+["']?/gi, replacement: 'clerk_secret=[REDACTED]' },

  // Generic secrets
  { pattern: /secret[=:]\s*["']?[A-Za-z0-9\-_]{16,}["']?/gi, replacement: 'secret=[REDACTED]' },
  { pattern: /password[=:]\s*["']?[^\s"']+["']?/gi, replacement: 'password=[REDACTED]' },

  // Encryption keys
  { pattern: /[A-Fa-f0-9]{64}/g, replacement: '[REDACTED_HEX_KEY]' },

  // Authorization headers
  { pattern: /authorization[=:]\s*["']?[^\s"']+["']?/gi, replacement: 'authorization=[REDACTED]' },
];

/**
 * Redact sensitive information from a string
 */
export function redactSensitiveInfo(text: string): string {
  let redacted = text;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  return redacted;
}

/**
 * Redact sensitive information from an Error object
 */
export function redactError(error: Error): Error {
  const redactedError = new Error(redactSensitiveInfo(error.message));
  redactedError.name = error.name;
  if (error.stack) {
    redactedError.stack = redactSensitiveInfo(error.stack);
  }
  return redactedError;
}

/**
 * Secure logging functions that redact sensitive data
 */
export const secureLog = {
  error: (message: string, ...args: unknown[]) => {
    const redactedMessage = redactSensitiveInfo(message);
    const redactedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return redactError(arg);
      }
      if (typeof arg === 'string') {
        return redactSensitiveInfo(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return redactSensitiveInfo(JSON.stringify(arg));
      }
      return arg;
    });
    console.error(redactedMessage, ...redactedArgs);
  },

  warn: (message: string, ...args: unknown[]) => {
    const redactedMessage = redactSensitiveInfo(message);
    const redactedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return redactSensitiveInfo(arg);
      }
      if (typeof arg === 'object' && arg !== null) {
        return redactSensitiveInfo(JSON.stringify(arg));
      }
      return arg;
    });
    console.warn(redactedMessage, ...redactedArgs);
  },

  info: (message: string, ...args: unknown[]) => {
    const redactedMessage = redactSensitiveInfo(message);
    console.info(redactedMessage, ...args);
  },
};
