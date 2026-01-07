/**
 * Environment variable validation
 * Ensures all required environment variables are set
 */

const requiredEnvVars = [
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
] as const;

const requiredServerEnvVars = [
  "CLERK_SECRET_KEY",
  "ENCRYPTION_KEY",
] as const;

export function validateClientEnv() {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join("\n")}\n\nPlease copy .env.example to .env.local and fill in the values.`
    );
  }
}

export function validateServerEnv() {
  const missing: string[] = [];

  for (const envVar of requiredServerEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required server environment variables:\n${missing.join("\n")}\n\nPlease copy .env.example to .env.local and fill in the values.`
    );
  }
}

// Validate on module load in development
if (process.env.NODE_ENV === "development") {
  if (typeof window === "undefined") {
    // Server-side
    validateServerEnv();
  }
  validateClientEnv();
}
