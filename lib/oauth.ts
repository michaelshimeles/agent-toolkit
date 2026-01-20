/**
 * OAuth utilities for integrations
 * Handles OAuth 2.0 authorization code flow
 */

import { encrypt, decrypt } from "./encryption";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  workspace_id?: string; // Notion-specific field
}

/**
 * Generates authorization URL for OAuth flow
 */
export function generateAuthorizationUrl(
  config: OAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    state,
    response_type: "code",
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token
 */
export async function exchangeCodeForToken(
  config: OAuthConfig,
  code: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refreshes an expired access token
 */
export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OAuth token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Generates a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Validates state parameter matches
 */
export function validateState(
  receivedState: string,
  expectedState: string
): boolean {
  return receivedState === expectedState;
}

/**
 * Encrypts OAuth token for storage
 */
export function encryptToken(token: OAuthTokenResponse): string {
  return encrypt(JSON.stringify(token));
}

/**
 * Decrypts OAuth token from storage
 */
export function decryptToken(encryptedToken: string): OAuthTokenResponse {
  const decrypted = decrypt(encryptedToken);
  return JSON.parse(decrypted);
}

/**
 * Checks if token is expired
 */
export function isTokenExpired(
  token: OAuthTokenResponse,
  issuedAt: number
): boolean {
  if (!token.expires_in) {
    return false; // No expiration info, assume valid
  }

  const expiresAt = issuedAt + token.expires_in * 1000;
  const now = Date.now();

  // Add 5 minute buffer before actual expiration
  return now >= expiresAt - 5 * 60 * 1000;
}

/**
 * OAuth configuration for GitHub
 */
export function getGitHubOAuthConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/github/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth credentials not configured");
  }

  return {
    clientId,
    clientSecret,
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user", "user:email"],
    redirectUri,
  };
}

/**
 * OAuth configuration for Linear
 */
export function getLinearOAuthConfig(): OAuthConfig {
  const clientId = process.env.LINEAR_CLIENT_ID;
  const clientSecret = process.env.LINEAR_CLIENT_SECRET;
  const redirectUri = process.env.LINEAR_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linear/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Linear OAuth credentials not configured");
  }

  return {
    clientId,
    clientSecret,
    authorizationUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read", "write"],
    redirectUri,
  };
}

/**
 * OAuth configuration for Notion
 */
export function getNotionOAuthConfig(): OAuthConfig {
  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/notion/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Notion OAuth credentials not configured");
  }

  return {
    clientId,
    clientSecret,
    authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    redirectUri,
  };
}

/**
 * OAuth configuration for Slack
 */
export function getSlackOAuthConfig(): OAuthConfig {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth credentials not configured");
  }

  return {
    clientId,
    clientSecret,
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: [
      "channels:read",
      "channels:write",
      "chat:write",
      "users:read",
      "search:read",
      "reactions:write",
      "groups:read",
      "groups:write",
    ],
    redirectUri,
  };
}
