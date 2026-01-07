/**
 * Slack MCP Integration
 * Provides tools for working with Slack channels, messages, and users
 */

import { Elysia, t } from "elysia";
import { WebClient } from "@slack/web-api";

export const slackRoutes = new Elysia({ prefix: "/slack" }).post(
  "/",
  async ({ body, headers }) => {
    const token = headers["x-oauth-token"];

    if (!token) {
      return new Response("Missing OAuth token", { status: 401 });
    }

    const slack = new WebClient(token);
    const { toolName, arguments: args } = body as { toolName: string; arguments?: any };

    try {
      switch (toolName) {
        case "send_message": {
          const result = await slack.chat.postMessage({
            channel: args.channel,
            text: args.text,
            blocks: args.blocks,
            thread_ts: args.thread_ts,
          });

          return {
            content: [
              {
                type: "text",
                text: `Message sent to ${args.channel}\nTimestamp: ${result.ts}`,
              },
            ],
          };
        }

        case "list_channels": {
          const result = await slack.conversations.list({
            types: args.types || "public_channel,private_channel",
            limit: args.limit || 100,
          });

          const channels = result.channels
            ?.map(
              (channel) =>
                `- #${channel.name} (${channel.id}) - ${channel.num_members || 0} members`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Slack Channels:\n${channels || "No channels found"}`,
              },
            ],
          };
        }

        case "get_channel_history": {
          const result = await slack.conversations.history({
            channel: args.channel,
            limit: args.limit || 50,
            oldest: args.oldest,
            latest: args.latest,
          });

          const messages = result.messages
            ?.map((msg) => {
              const timestamp = new Date(
                parseFloat(msg.ts!) * 1000
              ).toLocaleString();
              return `[${timestamp}] ${msg.user}: ${msg.text}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Channel History:\n${messages || "No messages found"}`,
              },
            ],
          };
        }

        case "search_messages": {
          const result = await slack.search.messages({
            query: args.query,
            count: args.count || 20,
            sort: args.sort || "timestamp",
            sort_dir: args.sort_dir || "desc",
          });

          const messages = result.messages?.matches
            ?.map((msg: any) => {
              const channel = msg.channel?.name || msg.channel?.id;
              return `[#${channel}] ${msg.username}: ${msg.text}`;
            })
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Search Results (${result.messages?.total || 0} found):\n${messages || "No results"}`,
              },
            ],
          };
        }

        case "list_users": {
          const result = await slack.users.list({
            limit: args.limit || 100,
          });

          const users = result.members
            ?.filter((user) => !user.deleted && !user.is_bot)
            .map(
              (user) =>
                `- ${user.real_name || user.name} (@${user.name}) - ${user.profile?.email || "No email"}`
            )
            .join("\n");

          return {
            content: [
              {
                type: "text",
                text: `Slack Users:\n${users || "No users found"}`,
              },
            ],
          };
        }

        case "get_user_info": {
          const result = await slack.users.info({
            user: args.user_id,
          });

          const user = result.user;
          if (!user) {
            return {
              content: [
                {
                  type: "text",
                  text: `User ${args.user_id} not found`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: "text",
                text: `User: ${user.real_name || user.name}\nUsername: @${user.name}\nEmail: ${user.profile?.email || "N/A"}\nTimezone: ${user.tz || "N/A"}\nStatus: ${user.profile?.status_text || "No status"}`,
              },
            ],
          };
        }

        case "create_channel": {
          const result = await slack.conversations.create({
            name: args.name,
            is_private: args.is_private || false,
          });

          return {
            content: [
              {
                type: "text",
                text: `Created channel: #${result.channel?.name} (${result.channel?.id})`,
              },
            ],
          };
        }

        case "invite_to_channel": {
          const result = await slack.conversations.invite({
            channel: args.channel,
            users: args.users,
          });

          return {
            content: [
              {
                type: "text",
                text: `Invited users to #${result.channel?.name || args.channel}`,
              },
            ],
          };
        }

        case "set_channel_topic": {
          const result = await slack.conversations.setTopic({
            channel: args.channel,
            topic: args.topic,
          });

          return {
            content: [
              {
                type: "text",
                text: `Set topic for channel to: ${(result as any).topic}`,
              },
            ],
          };
        }

        case "add_reaction": {
          await slack.reactions.add({
            channel: args.channel,
            timestamp: args.timestamp,
            name: args.reaction,
          });

          return {
            content: [
              {
                type: "text",
                text: `Added reaction :${args.reaction}: to message`,
              },
            ],
          };
        }

        default:
          return new Response(`Unknown tool: ${toolName}`, { status: 400 });
      }
    } catch (error) {
      console.error("Slack API error:", error);
      return new Response(
        error instanceof Error ? error.message : "Internal server error",
        { status: 500 }
      );
    }
  },
  {
    body: t.Object({
      toolName: t.String(),
      arguments: t.Optional(t.Any()),
    }),
  }
);

