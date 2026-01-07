import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-encryption-key-please-change-in-production";
const IV_LENGTH = 16;

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const prefix = "mcp_sk_";
  const randomBytes = crypto.randomBytes(32).toString("hex");
  return `${prefix}${randomBytes}`;
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Encrypt a string (for OAuth tokens)
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string (for OAuth tokens)
 */
export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Parse tool namespace from tool name
 * e.g., "github/create_issue" -> ["github", "create_issue"]
 */
export function parseNamespace(toolName: string): [string, string] {
  const parts = toolName.split("/");
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") {
    throw new Error(`Invalid tool name format: ${toolName}. Expected format: "integration/tool"`);
  }
  return [parts[0], parts[1]];
}
