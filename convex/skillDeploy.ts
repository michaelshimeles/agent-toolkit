"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Octokit } from "@octokit/rest";

/**
 * Generate README.md content for the skill repository
 */
function generateReadme(skillName: string, description: string, owner: string): string {
  return `# ${skillName}

${description}

## Installation

Add this skill to Claude Code by adding the following to your settings:

\`\`\`json
{
  "skills": [
    "https://github.com/${owner}/${skillName}"
  ]
}
\`\`\`

Or use the CLI:

\`\`\`bash
claude skills add https://github.com/${owner}/${skillName}
\`\`\`

## Usage

This skill will be automatically activated when relevant tasks are detected.

## License

MIT

---

Built with [MCP Hub Skill Builder](https://mcphub.io)
`;
}

/**
 * Deploy skill to a new GitHub repository
 */
export const deployToNewRepo = action({
  args: {
    skillId: v.id("skills"),
    repoName: v.string(),
    isPrivate: v.boolean(),
    githubToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; repoUrl?: string; error?: string }> => {
    // Get skill data
    const skill = await ctx.runQuery(api.skills.getSkill, {
      skillId: args.skillId,
    });

    if (!skill) {
      return { success: false, error: "Skill not found" };
    }

    try {
      const octokit = new Octokit({ auth: args.githubToken });

      // Get authenticated user
      const { data: user } = await octokit.users.getAuthenticated();
      const owner = user.login;

      // Check if repo already exists
      try {
        await octokit.repos.get({ owner, repo: args.repoName });
        return {
          success: false,
          error: `Repository ${owner}/${args.repoName} already exists`,
        };
      } catch (error: any) {
        if (error.status !== 404) {
          throw error;
        }
        // 404 means repo doesn't exist, which is what we want
      }

      // Create the repository
      const { data: repo } = await octokit.repos.createForAuthenticatedUser({
        name: args.repoName,
        description: `Agent Skill: ${skill.description}`,
        private: args.isPrivate,
        auto_init: false,
        has_issues: true,
        has_wiki: false,
      });

      // Prepare all files to commit
      const filesToCreate: Array<{ path: string; content: string }> = [
        { path: "SKILL.md", content: skill.files.skillMd },
        { path: "README.md", content: generateReadme(args.repoName, skill.description, owner) },
      ];

      // Add scripts
      if (skill.files.scripts) {
        for (const script of skill.files.scripts) {
          filesToCreate.push({
            path: `scripts/${script.name}`,
            content: script.content,
          });
        }
      }

      // Add references
      if (skill.files.references) {
        for (const ref of skill.files.references) {
          filesToCreate.push({
            path: `references/${ref.name}`,
            content: ref.content,
          });
        }
      }

      // Add assets
      if (skill.files.assets) {
        for (const asset of skill.files.assets) {
          filesToCreate.push({
            path: `assets/${asset.name}`,
            content: asset.content,
          });
        }
      }

      // Create blobs for each file
      const blobs = await Promise.all(
        filesToCreate.map(async (file) => {
          const { data } = await octokit.git.createBlob({
            owner,
            repo: args.repoName,
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64",
          });
          return { path: file.path, sha: data.sha };
        })
      );

      // Create tree
      const { data: tree } = await octokit.git.createTree({
        owner,
        repo: args.repoName,
        tree: blobs.map((blob) => ({
          path: blob.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        })),
      });

      // Create commit
      const { data: commit } = await octokit.git.createCommit({
        owner,
        repo: args.repoName,
        message: `Initial skill setup\n\nCreated with MCP Hub Skill Builder`,
        tree: tree.sha,
      });

      // Update main branch reference
      await octokit.git.createRef({
        owner,
        repo: args.repoName,
        ref: "refs/heads/main",
        sha: commit.sha,
      });

      // Update skill with deployment info
      await ctx.runMutation(api.skills.updateDeployment, {
        skillId: args.skillId,
        githubRepo: `${owner}/${args.repoName}`,
        githubUrl: repo.html_url,
      });

      return {
        success: true,
        repoUrl: repo.html_url,
      };
    } catch (error: any) {
      console.error("GitHub deployment error:", error);
      return {
        success: false,
        error: error.message || "Failed to deploy to GitHub",
      };
    }
  },
});

/**
 * Deploy skill to an existing GitHub repository
 */
export const deployToExistingRepo = action({
  args: {
    skillId: v.id("skills"),
    repoFullName: v.string(),
    path: v.optional(v.string()),
    githubToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; repoUrl?: string; error?: string }> => {
    const skill = await ctx.runQuery(api.skills.getSkill, {
      skillId: args.skillId,
    });

    if (!skill) {
      return { success: false, error: "Skill not found" };
    }

    try {
      const octokit = new Octokit({ auth: args.githubToken });
      const [owner, repo] = args.repoFullName.split("/");

      // Get default branch
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const defaultBranch = repoData.default_branch;

      // Get latest commit SHA
      const { data: ref } = await octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
      });
      const latestCommitSha = ref.object.sha;

      // Get base tree
      const { data: commit } = await octokit.git.getCommit({
        owner,
        repo,
        commit_sha: latestCommitSha,
      });
      const baseTreeSha = commit.tree.sha;

      // Prepare file paths with optional base path
      const basePath = args.path
        ? `${args.path.replace(/^\/|\/$/g, "")}/${skill.name}`
        : skill.name;

      const filesToCreate: Array<{ path: string; content: string }> = [
        { path: `${basePath}/SKILL.md`, content: skill.files.skillMd },
      ];

      // Add scripts
      if (skill.files.scripts) {
        for (const script of skill.files.scripts) {
          filesToCreate.push({
            path: `${basePath}/scripts/${script.name}`,
            content: script.content,
          });
        }
      }

      // Add references
      if (skill.files.references) {
        for (const ref of skill.files.references) {
          filesToCreate.push({
            path: `${basePath}/references/${ref.name}`,
            content: ref.content,
          });
        }
      }

      // Add assets
      if (skill.files.assets) {
        for (const asset of skill.files.assets) {
          filesToCreate.push({
            path: `${basePath}/assets/${asset.name}`,
            content: asset.content,
          });
        }
      }

      // Create blobs
      const blobs = await Promise.all(
        filesToCreate.map(async (file) => {
          const { data } = await octokit.git.createBlob({
            owner,
            repo,
            content: Buffer.from(file.content).toString("base64"),
            encoding: "base64",
          });
          return { path: file.path, sha: data.sha };
        })
      );

      // Create new tree
      const { data: newTree } = await octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: blobs.map((blob) => ({
          path: blob.path,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        })),
      });

      // Create commit
      const { data: newCommit } = await octokit.git.createCommit({
        owner,
        repo,
        message: `Add skill: ${skill.name}\n\nCreated with MCP Hub Skill Builder`,
        tree: newTree.sha,
        parents: [latestCommitSha],
      });

      // Update branch reference
      await octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${defaultBranch}`,
        sha: newCommit.sha,
      });

      const skillUrl = `${repoData.html_url}/tree/${defaultBranch}/${basePath}`;

      // Update skill with deployment info
      await ctx.runMutation(api.skills.updateDeployment, {
        skillId: args.skillId,
        githubRepo: args.repoFullName,
        githubUrl: skillUrl,
      });

      return {
        success: true,
        repoUrl: skillUrl,
      };
    } catch (error: any) {
      console.error("GitHub deployment error:", error);
      return {
        success: false,
        error: error.message || "Failed to deploy to GitHub",
      };
    }
  },
});

/**
 * List user's GitHub repositories
 */
export const listGitHubRepos = action({
  args: {
    githubToken: v.string(),
  },
  handler: async (_ctx, args): Promise<{ repos: Array<{ name: string; full_name: string }>; error?: string }> => {
    try {
      const octokit = new Octokit({ auth: args.githubToken });

      const { data } = await octokit.repos.listForAuthenticatedUser({
        sort: "updated",
        per_page: 100,
      });

      return {
        repos: data.map((repo) => ({
          name: repo.name,
          full_name: repo.full_name,
        })),
      };
    } catch (error: any) {
      return {
        repos: [],
        error: error.message || "Failed to list repositories",
      };
    }
  },
});
