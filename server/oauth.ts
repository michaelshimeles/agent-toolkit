/**
 * OAuth Routes Module
 * Provides OAuth authorization and callback endpoints for all integrations
 */

import { Elysia, t } from "elysia";
import { currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import {
  generateState,
  validateState,
  exchangeCodeForToken,
  encryptToken,
  getGitHubOAuthConfig,
  getLinearOAuthConfig,
  getNotionOAuthConfig,
  getSlackOAuthConfig,
} from "@/lib/oauth";

// Helper to create OAuth authorize handler
const createAuthorizeHandler = (
  providerName: string,
  getConfig: () => any,
  cookieName: string,
  customParams?: Record<string, string>
) => {
  return async () => {
    try {
      const user = await currentUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const config = getConfig();
      const state = generateState();

      const cookieStore = await cookies();
      cookieStore.set(cookieName, state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });

      const authUrl = new URL(config.authorizationUrl);
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", config.redirectUri);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("response_type", "code");

      // Handle scopes - Slack uses comma, others use space
      if (providerName === "slack") {
        authUrl.searchParams.set("scope", config.scopes.join(","));
      } else if (config.scopes) {
        authUrl.searchParams.set("scope", config.scopes.join(" "));
      }

      // Add any custom params (e.g., Notion's owner=user)
      if (customParams) {
        Object.entries(customParams).forEach(([key, value]) => {
          authUrl.searchParams.set(key, value);
        });
      }

      return Response.redirect(authUrl.toString(), 302);
    } catch (error) {
      console.error(`${providerName} OAuth authorization error:`, error);
      return new Response(
        JSON.stringify({ error: "Failed to initiate OAuth flow" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };
};

// Helper to create OAuth callback handler
const createCallbackHandler = (
  providerName: string,
  slug: string,
  getConfig: () => any,
  cookieName: string
) => {
  return async ({ query, request }: { query: any; request: Request }) => {
    try {
      const user = await currentUser();
      const baseUrl = new URL(request.url).origin;

      if (!user) {
        return Response.redirect(`${baseUrl}/sign-in?error=unauthorized`, 302);
      }

      const code = query.code;
      const receivedState = query.state;
      const error = query.error;

      if (error) {
        return Response.redirect(
          `${baseUrl}/dashboard/integrations?error=${error}`,
          302
        );
      }

      if (!code || !receivedState) {
        return Response.redirect(
          `${baseUrl}/dashboard/integrations?error=missing_params`,
          302
        );
      }

      const cookieStore = await cookies();
      const expectedState = cookieStore.get(cookieName)?.value;

      if (!expectedState || !validateState(receivedState, expectedState)) {
        return Response.redirect(
          `${baseUrl}/dashboard/integrations?error=invalid_state`,
          302
        );
      }

      cookieStore.delete(cookieName);

      const config = getConfig();
      const tokenResponse = await exchangeCodeForToken(config, code);
      const encryptedToken = encryptToken(tokenResponse);

      const integration = await fetchQuery(api.integrations.getBySlug, {
        slug,
      });

      if (!integration) {
        throw new Error(`${providerName} integration not found in database`);
      }

      await fetchMutation(api.integrations.enableUserIntegration, {
        integrationId: integration._id,
        oauthTokenEncrypted: encryptedToken,
        tokenIssuedAt: Date.now(),
      });

      return Response.redirect(
        `${baseUrl}/dashboard/integrations?success=${slug}_connected`,
        302
      );
    } catch (error) {
      console.error(`${providerName} OAuth callback error:`, error);
      const baseUrl = new URL(request.url).origin;
      return Response.redirect(
        `${baseUrl}/dashboard/integrations?error=oauth_failed`,
        302
      );
    }
  };
};

export const oauthRoutes = new Elysia({ prefix: "/oauth" })
  // GitHub OAuth
  .get(
    "/github/authorize",
    createAuthorizeHandler("GitHub", getGitHubOAuthConfig, "github_oauth_state")
  )
  .get("/github/callback", ({ query, request }) =>
    createCallbackHandler(
      "GitHub",
      "github",
      getGitHubOAuthConfig,
      "github_oauth_state"
    )({ query, request })
  )

  // Linear OAuth
  .get(
    "/linear/authorize",
    createAuthorizeHandler("Linear", getLinearOAuthConfig, "linear_oauth_state")
  )
  .get("/linear/callback", ({ query, request }) =>
    createCallbackHandler(
      "Linear",
      "linear",
      getLinearOAuthConfig,
      "linear_oauth_state"
    )({ query, request })
  )

  // Notion OAuth
  .get(
    "/notion/authorize",
    createAuthorizeHandler(
      "Notion",
      getNotionOAuthConfig,
      "notion_oauth_state",
      { owner: "user" }
    )
  )
  .get("/notion/callback", ({ query, request }) =>
    createCallbackHandler(
      "Notion",
      "notion",
      getNotionOAuthConfig,
      "notion_oauth_state"
    )({ query, request })
  )

  // Slack OAuth
  .get(
    "/slack/authorize",
    createAuthorizeHandler("Slack", getSlackOAuthConfig, "slack_oauth_state")
  )
  .get("/slack/callback", async ({ query, request }) => {
    try {
      const user = await currentUser();
      const baseUrl = new URL(request.url).origin;

      if (!user) {
        return Response.redirect(`${baseUrl}/sign-in`, 302);
      }

      const code = query.code;
      const state = query.state;

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: "Missing code or state" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const cookieStore = await cookies();
      const storedState = cookieStore.get("slack_oauth_state")?.value;

      if (state !== storedState) {
        return new Response(
          JSON.stringify({ error: "Invalid state parameter" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      cookieStore.delete("slack_oauth_state");

      const config = getSlackOAuthConfig();
      const token = await exchangeCodeForToken(config, code);
      const encryptedToken = encryptToken(token);

      const convex = getConvexClient();
      const convexUser = await convex.query(api.auth.getUserByClerkId, {
        clerkId: user.id,
      });

      if (!convexUser) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      const integration = await convex.query(api.integrations.getBySlug, {
        slug: "slack",
      });

      if (!integration) {
        return new Response(
          JSON.stringify({ error: "Slack integration not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await convex.mutation(api.integrations.enableIntegration, {
        userId: convexUser._id,
        integrationId: integration._id,
        oauthTokenEncrypted: encryptedToken,
        tokenIssuedAt: Date.now(),
      });

      return Response.redirect(
        `${baseUrl}/dashboard/integrations?success=slack`,
        302
      );
    } catch (error) {
      console.error("Slack OAuth callback error:", error);
      const baseUrl = new URL(request.url).origin;
      return Response.redirect(
        `${baseUrl}/dashboard/integrations?error=slack_oauth_failed`,
        302
      );
    }
  });

