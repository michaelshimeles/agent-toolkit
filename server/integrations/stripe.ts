/**
 * Stripe Integration
 * Provides MCP tools for managing Stripe customers, invoices, and subscriptions
 */

import { Elysia, t } from "elysia";

export const stripeRoutes = new Elysia({ prefix: "/stripe" }).post(
  "/",
  async ({ body, headers }) => {
    const apiKey = headers["x-oauth-token"];

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Missing Stripe API key",
          },
        ],
        isError: true,
      };
    }

    const baseUrl = "https://api.stripe.com/v1";
    const authString = Buffer.from(`${apiKey}:`).toString("base64");

    const { toolName, arguments: args } = body as { toolName: string; arguments: any };

    try {
      switch (toolName) {
        case "list_customers": {
          const { limit = 10, starting_after, email } = args;

          const params = new URLSearchParams();
          params.append("limit", limit.toString());
          if (starting_after) params.append("starting_after", starting_after);
          if (email) params.append("email", email);

          const response = await fetch(`${baseUrl}/customers?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    customers: data.data,
                    has_more: data.has_more,
                    count: data.data.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_customer": {
          const { customerId } = args;

          const response = await fetch(`${baseUrl}/customers/${customerId}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const customer = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(customer, null, 2),
              },
            ],
          };
        }

        case "create_customer": {
          const { email, name, description, metadata } = args;

          const formData = new URLSearchParams();
          if (email) formData.append("email", email);
          if (name) formData.append("name", name);
          if (description) formData.append("description", description);
          if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
              formData.append(`metadata[${key}]`, value as string);
            });
          }

          const response = await fetch(`${baseUrl}/customers`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const customer = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    customer: customer,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "update_customer": {
          const { customerId, email, name, description, metadata } = args;

          const formData = new URLSearchParams();
          if (email) formData.append("email", email);
          if (name) formData.append("name", name);
          if (description) formData.append("description", description);
          if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
              formData.append(`metadata[${key}]`, value as string);
            });
          }

          const response = await fetch(`${baseUrl}/customers/${customerId}`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const customer = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    customer: customer,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "list_invoices": {
          const { limit = 10, customer, status } = args;

          const params = new URLSearchParams();
          params.append("limit", limit.toString());
          if (customer) params.append("customer", customer);
          if (status) params.append("status", status);

          const response = await fetch(`${baseUrl}/invoices?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    invoices: data.data,
                    has_more: data.has_more,
                    count: data.data.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_invoice": {
          const { invoiceId } = args;

          const response = await fetch(`${baseUrl}/invoices/${invoiceId}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const invoice = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(invoice, null, 2),
              },
            ],
          };
        }

        case "list_subscriptions": {
          const { limit = 10, customer, status } = args;

          const params = new URLSearchParams();
          params.append("limit", limit.toString());
          if (customer) params.append("customer", customer);
          if (status) params.append("status", status);

          const response = await fetch(`${baseUrl}/subscriptions?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    subscriptions: data.data,
                    has_more: data.has_more,
                    count: data.data.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "get_subscription": {
          const { subscriptionId } = args;

          const response = await fetch(
            `${baseUrl}/subscriptions/${subscriptionId}`,
            {
              headers: {
                Authorization: `Basic ${authString}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const subscription = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(subscription, null, 2),
              },
            ],
          };
        }

        case "cancel_subscription": {
          const { subscriptionId } = args;

          const response = await fetch(
            `${baseUrl}/subscriptions/${subscriptionId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Basic ${authString}`,
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const subscription = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    subscription: subscription,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "list_payment_methods": {
          const { customer, type = "card", limit = 10 } = args;

          const params = new URLSearchParams();
          params.append("customer", customer);
          params.append("type", type);
          params.append("limit", limit.toString());

          const response = await fetch(`${baseUrl}/payment_methods?${params}`, {
            headers: {
              Authorization: `Basic ${authString}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const data = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    payment_methods: data.data,
                    has_more: data.has_more,
                    count: data.data.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "create_payment_intent": {
          const {
            amount,
            currency = "usd",
            customer,
            description,
            metadata,
          } = args;

          const formData = new URLSearchParams();
          formData.append("amount", amount.toString());
          formData.append("currency", currency);
          if (customer) formData.append("customer", customer);
          if (description) formData.append("description", description);
          if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
              formData.append(`metadata[${key}]`, value as string);
            });
          }

          const response = await fetch(`${baseUrl}/payment_intents`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const paymentIntent = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    payment_intent: paymentIntent,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case "create_refund": {
          const { payment_intent, amount, reason } = args;

          const formData = new URLSearchParams();
          formData.append("payment_intent", payment_intent);
          if (amount) formData.append("amount", amount.toString());
          if (reason) formData.append("reason", reason);

          const response = await fetch(`${baseUrl}/refunds`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${authString}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Stripe API error: ${response.statusText}`);
          }

          const refund = await response.json();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    success: true,
                    refund: refund,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text",
                text: `Unknown tool: ${toolName}`,
              },
            ],
            isError: true,
          };
      }
    } catch (error: any) {
      console.error(`Stripe API error (${toolName}):`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error occurred"}`,
          },
        ],
        isError: true,
      };
    }
  },
  {
    body: t.Object({
      toolName: t.String(),
      arguments: t.Any(),
    }),
  }
);

