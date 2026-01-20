/**
 * GitHub Deployment for Skills
 * Handles deploying skills to GitHub repositories
 */

import { Octokit } from "@octokit/rest";

export interface SkillFiles {
  skillMd: string;
  scripts?: Array<{ name: string; content: string; language: string }>;
  references?: Array<{ name: string; content: string }>;
  assets?: Array<{ name: string; content: string; type: string }>;
}

export interface DeploymentResult {
  success: boolean;
  repoUrl?: string;
  repoFullName?: string;
  error?: string;
}

export interface RepoInfo {
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string;
}

/**
 * Create an Octokit client with the user's OAuth token
 */
function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token });
}

/**
 * List user's repositories
 */
export async function listUserRepos(token: string): Promise<RepoInfo[]> {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
  });

  return data.map((repo) => ({
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    default_branch: repo.default_branch || "main",
  }));
}

/**
 * Check if a repository exists
 */
export async function checkRepoExists(
  token: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const octokit = createOctokit(token);

  try {
    await octokit.repos.get({ owner, repo });
    return true;
  } catch (error: any) {
    if (error.status === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Create a new repository for the skill
 */
export async function createSkillRepo(
  token: string,
  skillName: string,
  description: string,
  isPrivate: boolean
): Promise<RepoInfo> {
  const octokit = createOctokit(token);

  const { data } = await octokit.repos.createForAuthenticatedUser({
    name: skillName,
    description: `Agent Skill: ${description}`,
    private: isPrivate,
    auto_init: false,
    has_issues: true,
    has_wiki: false,
  });

  return {
    name: data.name,
    full_name: data.full_name,
    html_url: data.html_url,
    default_branch: data.default_branch || "main",
  };
}

/**
 * Generate README.md content for the skill repository
 */
function generateReadme(skillName: string, description: string): string {
  return `# ${skillName}

${description}

## Installation

Add this skill to Claude Code by adding the following to your settings:

\`\`\`json
{
  "skills": [
    "https://github.com/YOUR_USERNAME/${skillName}"
  ]
}
\`\`\`

Or use the CLI:

\`\`\`bash
claude skills add https://github.com/YOUR_USERNAME/${skillName}
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
 * Deploy skill files to a new repository
 */
export async function deployToNewRepo(
  token: string,
  skillName: string,
  description: string,
  files: SkillFiles,
  isPrivate: boolean
): Promise<DeploymentResult> {
  try {
    const octokit = createOctokit(token);

    // Get authenticated user
    const { data: user } = await octokit.users.getAuthenticated();
    const owner = user.login;

    // Check if repo already exists
    const exists = await checkRepoExists(token, owner, skillName);
    if (exists) {
      return {
        success: false,
        error: `Repository ${owner}/${skillName} already exists. Choose a different name or deploy to existing repo.`,
      };
    }

    // Create the repository
    const repo = await createSkillRepo(token, skillName, description, isPrivate);

    // Prepare all files to commit
    const filesToCreate: Array<{ path: string; content: string }> = [
      { path: "SKILL.md", content: files.skillMd },
      { path: "README.md", content: generateReadme(skillName, description) },
    ];

    // Add scripts
    if (files.scripts) {
      for (const script of files.scripts) {
        filesToCreate.push({
          path: `scripts/${script.name}`,
          content: script.content,
        });
      }
    }

    // Add references
    if (files.references) {
      for (const ref of files.references) {
        filesToCreate.push({
          path: `references/${ref.name}`,
          content: ref.content,
        });
      }
    }

    // Add assets
    if (files.assets) {
      for (const asset of files.assets) {
        filesToCreate.push({
          path: `assets/${asset.name}`,
          content: asset.content,
        });
      }
    }

    // Create initial commit with all files
    // First, create blobs for each file
    const blobs = await Promise.all(
      filesToCreate.map(async (file) => {
        const { data } = await octokit.git.createBlob({
          owner,
          repo: skillName,
          content: Buffer.from(file.content).toString("base64"),
          encoding: "base64",
        });
        return { path: file.path, sha: data.sha };
      })
    );

    // Create tree
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo: skillName,
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
      repo: skillName,
      message: `Initial skill setup\n\nCreated with MCP Hub Skill Builder`,
      tree: tree.sha,
    });

    // Update main branch reference
    await octokit.git.createRef({
      owner,
      repo: skillName,
      ref: "refs/heads/main",
      sha: commit.sha,
    });

    return {
      success: true,
      repoUrl: repo.html_url,
      repoFullName: repo.full_name,
    };
  } catch (error: any) {
    console.error("GitHub deployment error:", error);
    return {
      success: false,
      error: error.message || "Failed to deploy to GitHub",
    };
  }
}

/**
 * Deploy skill files to an existing repository
 */
export async function deployToExistingRepo(
  token: string,
  repoFullName: string,
  skillName: string,
  files: SkillFiles,
  path: string = ""
): Promise<DeploymentResult> {
  try {
    const octokit = createOctokit(token);
    const [owner, repo] = repoFullName.split("/");

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
    const basePath = path ? `${path.replace(/^\/|\/$/g, "")}/${skillName}` : skillName;

    const filesToCreate: Array<{ path: string; content: string }> = [
      { path: `${basePath}/SKILL.md`, content: files.skillMd },
    ];

    // Add scripts
    if (files.scripts) {
      for (const script of files.scripts) {
        filesToCreate.push({
          path: `${basePath}/scripts/${script.name}`,
          content: script.content,
        });
      }
    }

    // Add references
    if (files.references) {
      for (const ref of files.references) {
        filesToCreate.push({
          path: `${basePath}/references/${ref.name}`,
          content: ref.content,
        });
      }
    }

    // Add assets
    if (files.assets) {
      for (const asset of files.assets) {
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
      message: `Add skill: ${skillName}\n\nCreated with MCP Hub Skill Builder`,
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

    return {
      success: true,
      repoUrl: `${repoData.html_url}/tree/${defaultBranch}/${basePath}`,
      repoFullName: repoFullName,
    };
  } catch (error: any) {
    console.error("GitHub deployment error:", error);
    return {
      success: false,
      error: error.message || "Failed to deploy to GitHub",
    };
  }
}

/**
 * Get the GitHub username from token
 */
export async function getGitHubUser(token: string): Promise<string> {
  const octokit = createOctokit(token);
  const { data } = await octokit.users.getAuthenticated();
  return data.login;
}
