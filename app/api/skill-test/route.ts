/**
 * Skill Test API Route
 * Tests a skill with a sample prompt by sending it to Claude with the skill's SKILL.md as context
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { getUserAnthropicApiKeyByClerkId } from "@/lib/user-api-key";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "@/convex/_generated/dataModel";

interface SkillTestRequest {
  skillId: string;
  testPrompt: string;
  apiKey?: string;
}

interface SkillTestResponse {
  response: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  latencyMs: number;
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await req.json();
    const { skillId, testPrompt, apiKey: requestApiKey } = body as SkillTestRequest;

    // Validate required fields
    if (!skillId) {
      return NextResponse.json(
        { error: "Missing required field: skillId" },
        { status: 400 }
      );
    }

    if (!testPrompt) {
      return NextResponse.json(
        { error: "Missing required field: testPrompt" },
        { status: 400 }
      );
    }

    // Authenticate user
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to test skills." },
        { status: 401 }
      );
    }

    // Get the Convex client
    const convex = getConvexClient();

    // Get the user from Convex
    const user = await convex.query(api.auth.getUserByClerkId, { clerkId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Load the skill from Convex
    let skill;
    try {
      skill = await convex.query(api.skills.getSkill, {
        skillId: skillId as Id<"skills">,
      });
    } catch {
      return NextResponse.json(
        { error: "Invalid skill ID format" },
        { status: 400 }
      );
    }

    if (!skill) {
      return NextResponse.json(
        { error: "Skill not found" },
        { status: 404 }
      );
    }

    // Verify the skill belongs to the authenticated user
    if (skill.userId !== user._id) {
      return NextResponse.json(
        { error: "You do not have permission to test this skill" },
        { status: 403 }
      );
    }

    // Determine which API key to use (priority: request body > user settings > env)
    let apiKey = requestApiKey;

    if (!apiKey) {
      apiKey = await getUserAnthropicApiKeyByClerkId(clerkId) || undefined;
    }

    if (!apiKey) {
      apiKey = process.env.ANTHROPIC_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "No Anthropic API key available. Please provide an API key in the request, configure one in settings, or contact support."
        },
        { status: 400 }
      );
    }

    // Create Anthropic client
    const client = new Anthropic({ apiKey });

    // Construct the system prompt using the skill's SKILL.md content
    const systemPrompt = `You are Claude, an AI assistant using a skill to help the user.

## Active Skill

The following skill instructions should guide your response:

${skill.files.skillMd}

## Instructions

Follow the skill instructions above to respond to the user's request. If the skill provides specific formatting, tools, or workflows, use them appropriately.`;

    // Call Claude API
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: testPrompt,
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { error: "No text response received from Claude" },
        { status: 500 }
      );
    }

    // Calculate latency
    const latencyMs = Date.now() - startTime;

    // Build the response
    const result: SkillTestResponse = {
      response: textContent.text,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      latencyMs,
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Skill test error:", error);

    const latencyMs = Date.now() - startTime;

    // Handle specific Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "Invalid Anthropic API key. Please check your API key configuration." },
          { status: 401 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      // Check for billing/credit errors
      if (error.message?.includes("credit") || error.message?.includes("billing")) {
        return NextResponse.json(
          { error: "Anthropic API billing issue. Please check your API key has sufficient credits." },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        error: errorMessage,
        latencyMs
      },
      { status: 500 }
    );
  }
}
