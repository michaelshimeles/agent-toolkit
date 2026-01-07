/**
 * Integrations Module
 * Combines all integration handlers into a single Elysia app
 */

import { Elysia } from "elysia";
import { airtableRoutes } from "./airtable";
import { githubRoutes } from "./github";
import { gmailRoutes } from "./gmail";
import { googleDriveRoutes } from "./google-drive";
import { jiraRoutes } from "./jira";
import { linearRoutes } from "./linear";
import { notionRoutes } from "./notion";
import { postgresqlRoutes } from "./postgresql";
import { slackRoutes } from "./slack";
import { stripeRoutes } from "./stripe";

export const integrationsRoutes = new Elysia({ prefix: "/integrations" })
  .use(airtableRoutes)
  .use(githubRoutes)
  .use(gmailRoutes)
  .use(googleDriveRoutes)
  .use(jiraRoutes)
  .use(linearRoutes)
  .use(notionRoutes)
  .use(postgresqlRoutes)
  .use(slackRoutes)
  .use(stripeRoutes);

