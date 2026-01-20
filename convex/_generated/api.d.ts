/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as analytics from "../analytics.js";
import type * as auth from "../auth.js";
import type * as builder from "../builder.js";
import type * as builderActions from "../builderActions.js";
import type * as comments from "../comments.js";
import type * as integrations from "../integrations.js";
import type * as seed from "../seed.js";
import type * as sharing from "../sharing.js";
import type * as skillDeploy from "../skillDeploy.js";
import type * as skillGeneration from "../skillGeneration.js";
import type * as skills from "../skills.js";
import type * as usage from "../usage.js";
import type * as versions from "../versions.js";
import type * as workspaces from "../workspaces.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  aiActions: typeof aiActions;
  analytics: typeof analytics;
  auth: typeof auth;
  builder: typeof builder;
  builderActions: typeof builderActions;
  comments: typeof comments;
  integrations: typeof integrations;
  seed: typeof seed;
  sharing: typeof sharing;
  skillDeploy: typeof skillDeploy;
  skillGeneration: typeof skillGeneration;
  skills: typeof skills;
  usage: typeof usage;
  versions: typeof versions;
  workspaces: typeof workspaces;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
