import { objectIdSchema } from "@codesense/shared";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import {
  getGithubAccessToken,
  listGithubCommits
} from "../modules/github/github.service.js";
import { repositoryService } from "../modules/repositories/repository.service.js";
import { scanService } from "../modules/scans/scan.service.js";
import {
  listRecentCommitsFromRemote
} from "../services/git.service.js";
import { MCP_LIMITS } from "./limits.js";
import {
  inspectProject,
  listFileTree,
  readRepositoryFile,
  searchRepositoryCode
} from "./content.js";
import {
  collectDependencies,
  dependenciesFromScan
} from "./dependencies.js";
import { runTool } from "./result.js";
import { resolveHeadCommit, resolveSnapshot } from "./snapshot.js";

const repositoryIdField = objectIdSchema.describe(
  "CodeSense repository id from list_repositories"
);

const repoRefSchema = z.object({
  repositoryId: repositoryIdField,
  branch: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe("Branch name. Defaults to the repository default branch."),
  commit: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .optional()
    .describe("Commit SHA the answer should reflect. Defaults to the branch head."),
  ref: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe(
      "Branch name or commit SHA. Used when branch/commit are omitted. Defaults to the repository default branch."
    )
});

const SHA_REF = /^[0-9a-f]{7,64}$/i;

function resolveRepoRef(input: {
  branch?: string;
  commit?: string;
  ref?: string;
}): { branch?: string; commit?: string } {
  let branch = input.branch;
  let commit = input.commit;

  if (input.ref) {
    if (SHA_REF.test(input.ref)) {
      commit = commit ?? input.ref;
    } else {
      branch = branch ?? input.ref;
    }
  }

  return { branch, commit };
}

function capText(value: string | undefined, max: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length > max ? `${value.slice(0, max)}\n…[truncated]` : value;
}

export async function handleListRepositories(userId: string): Promise<unknown> {
  const repositories = await repositoryService.listRepositories(userId);
  const latest = await scanService.listLatestByRepository(userId);

  return {
    repositories: repositories.map((repository) => {
      const scan = latest.get(repository.id);
      return {
        id: repository.id,
        name: repository.name,
        url: repository.url,
        provider: repository.provider,
        defaultBranch: repository.defaultBranch,
        description: repository.description ?? null,
        latestScan: scan
          ? {
              id: scan.id,
              status: scan.status,
              branch: scan.branch,
              commitHash: scan.commitHash ?? null,
              completedAt: scan.completedAt ?? null
            }
          : null
      };
    })
  };
}

export async function handleGetRepositoryOverview(
  userId: string,
  input: z.infer<typeof repoRefSchema>
): Promise<unknown> {
  const repository = await repositoryService.getRepository(
    userId,
    input.repositoryId
  );
  const ref = resolveRepoRef(input);
  const branch = ref.branch ?? repository.defaultBranch;
  const headCommit =
    ref.commit ?? (await resolveHeadCommit(userId, input.repositoryId, branch));
  const latestScan = await scanService.getLatestScanForRepository(
    userId,
    input.repositoryId
  );
  const summary = latestScan?.summary;
  const stale =
    latestScan?.commitHash && headCommit
      ? latestScan.commitHash !== headCommit
      : null;

  return {
    repository: {
      id: repository.id,
      name: repository.name,
      url: repository.url,
      provider: repository.provider,
      defaultBranch: repository.defaultBranch,
      description: repository.description ?? null
    },
    branch,
    headCommit: headCommit ?? null,
    lastScannedCommit: latestScan?.commitHash ?? null,
    lastScannedAt: latestScan?.completedAt ?? null,
    stale,
    latestScanStatus: latestScan?.status ?? null,
    files: summary?.files ?? null,
    linesOfCode: summary?.linesOfCode ?? null,
    languages: summary?.languages ?? [],
    dependencies: (summary?.dependencies ?? []).slice(
      0,
      MCP_LIMITS.dependenciesMax
    ),
    aiSummary: capText(latestScan?.aiSummary, MCP_LIMITS.aiSummaryMaxChars) ?? null,
    reflectedCommit: latestScan?.commitHash ?? headCommit ?? null,
    note:
      "Language, LOC, dependency, and AI summary fields come from the latest scan of this repository. headCommit is the current branch tip."
  };
}

export async function handleGetFileTree(
  userId: string,
  input: z.infer<typeof repoRefSchema>
): Promise<unknown> {
  const snapshot = await resolveSnapshot(userId, input.repositoryId, resolveRepoRef(input));
  return listFileTree(snapshot.rootDir, {
    commitHash: snapshot.commitHash,
    branch: snapshot.branch
  });
}

export async function handleReadFile(
  userId: string,
  input: z.infer<typeof repoRefSchema> & { path: string }
): Promise<unknown> {
  const snapshot = await resolveSnapshot(userId, input.repositoryId, resolveRepoRef(input));
  return readRepositoryFile(snapshot.rootDir, input.path, {
    commitHash: snapshot.commitHash,
    branch: snapshot.branch
  });
}

export async function handleSearchCode(
  userId: string,
  input: z.infer<typeof repoRefSchema> & {
    query: string;
    isRegex: boolean;
    maxMatches?: number;
  }
): Promise<unknown> {
  const snapshot = await resolveSnapshot(userId, input.repositoryId, resolveRepoRef(input));
  return searchRepositoryCode(snapshot.rootDir, input.query, {
    isRegex: input.isRegex === true,
    maxMatches: input.maxMatches,
    commitHash: snapshot.commitHash,
    branch: snapshot.branch
  });
}

export async function handleListBranches(
  userId: string,
  input: { repositoryId: string }
): Promise<unknown> {
  const repository = await repositoryService.getRepository(
    userId,
    input.repositoryId
  );
  const branches = await repositoryService.listBranches(
    userId,
    input.repositoryId
  );

  return {
    repositoryId: repository.id,
    defaultBranch: repository.defaultBranch,
    branches
  };
}

export async function handleListCommits(
  userId: string,
  input: { repositoryId: string; branch?: string; limit: number }
): Promise<unknown> {
  const repository = await repositoryService.getOwnedRepository(
    userId,
    input.repositoryId
  );
  const branch = input.branch ?? repository.defaultBranch;
  const limit = Math.min(input.limit, MCP_LIMITS.commitsMax);

  if (repository.provider === "github") {
    const accessToken = await getGithubAccessToken(userId);
    const commits = await listGithubCommits(accessToken, repository.url, branch);
    return {
      repositoryId: repository._id.toString(),
      branch,
      source: "github",
      commits: commits.slice(0, limit).map((commit) => ({
        sha: commit.sha,
        message: commit.message.split("\n")[0] ?? "",
        author: commit.author,
        committedAt: commit.committedAt,
        url: commit.url
      }))
    };
  }

  const commits = await listRecentCommitsFromRemote(
    repository.url,
    branch,
    limit
  );

  return {
    repositoryId: repository._id.toString(),
    branch,
    source: "git",
    commits
  };
}

export async function handleListScans(
  userId: string,
  input: { repositoryId: string; limit: number }
): Promise<unknown> {
  const scans = await scanService.listScansForRepository(
    userId,
    input.repositoryId
  );
  const limit = Math.min(input.limit, MCP_LIMITS.scansMax);

  return {
    repositoryId: input.repositoryId,
    truncated: scans.length > limit,
    scans: scans.slice(0, limit).map((scan) => ({
      id: scan.id,
      status: scan.status,
      branch: scan.branch,
      commitHash: scan.commitHash ?? null,
      completedAt: scan.completedAt ?? null,
      error: scan.error ?? null
    }))
  };
}

export async function handleGetScan(
  userId: string,
  input: { scanId: string }
): Promise<unknown> {
  const scan = await scanService.getScan(userId, input.scanId);

  return {
    ...scan,
    aiSummary: capText(scan.aiSummary, MCP_LIMITS.aiSummaryMaxChars),
    summary: scan.summary
      ? {
          ...scan.summary,
          dependencies: scan.summary.dependencies.slice(
            0,
            MCP_LIMITS.dependenciesMax
          )
        }
      : undefined
  };
}

export async function handleTriggerScan(
  userId: string,
  input: { repositoryId: string; branch?: string }
): Promise<unknown> {
  const repository = await repositoryService.getRepository(
    userId,
    input.repositoryId
  );
  const scan = await scanService.createScan(userId, input.repositoryId, {
    branch: input.branch ?? repository.defaultBranch
  });

  return {
    id: scan.id,
    status: scan.status,
    branch: scan.branch,
    repositoryId: scan.repositoryId,
    message: "Scan queued. Use get_scan or list_scans to poll status."
  };
}

export async function handleGetProjectInfo(
  userId: string,
  input: z.infer<typeof repoRefSchema>
): Promise<unknown> {
  const snapshot = await resolveSnapshot(userId, input.repositoryId, {
    ...resolveRepoRef(input)
  });
  return inspectProject(snapshot.rootDir, {
    commitHash: snapshot.commitHash,
    branch: snapshot.branch
  });
}

export async function handleGetDependencies(
  userId: string,
  input: z.infer<typeof repoRefSchema> & { workspace?: string }
): Promise<unknown> {
  const repository = await repositoryService.getRepository(
    userId,
    input.repositoryId
  );
  const ref = resolveRepoRef(input);
  const branch = ref.branch ?? repository.defaultBranch;
  const workspace = input.workspace?.trim() || undefined;

  if (!workspace) {
    const scans = await scanService.listScansForRepository(
      userId,
      input.repositoryId
    );
    const matching = scans.find((scan) => {
      if (scan.status !== "completed" || !scan.summary?.dependencies?.length) {
        return false;
      }
      if (ref.commit) {
        return Boolean(
          scan.commitHash && scan.commitHash.startsWith(ref.commit)
        );
      }
      return scan.branch === branch;
    });

    if (matching?.summary?.dependencies && matching.commitHash) {
      return {
        repositoryId: input.repositoryId,
        ...dependenciesFromScan(matching.summary.dependencies, {
          commitHash: matching.commitHash,
          branch: matching.branch
        })
      };
    }
  }

  const snapshot = await resolveSnapshot(userId, input.repositoryId, {
    branch,
    commit: ref.commit
  });
  const collected = await collectDependencies(snapshot.rootDir, {
    commitHash: snapshot.commitHash,
    branch: snapshot.branch
  }, workspace);

  return {
    repositoryId: input.repositoryId,
    ...collected
  };
}

export function registerMcpTools(server: McpServer, userId: string): void {
  server.registerTool(
    "list_repositories",
    {
      title: "List repositories",
      description:
        "List CodeSense repositories owned by the authenticated user, including the latest scan status and commit. Use this first to discover repository ids. Output is JSON.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => runTool(() => handleListRepositories(userId))
  );

  server.registerTool(
    "get_repository_overview",
    {
      title: "Repository overview",
      description:
        "Return languages, LOC, dependencies, AI summary, default branch, last scanned commit, and whether that scan is stale versus the current branch head. Analysis fields come from stored scans, not a live clone. Output is JSON.",
      inputSchema: repoRefSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleGetRepositoryOverview(userId, args))
  );

  server.registerTool(
    "get_file_tree",
    {
      title: "File tree",
      description:
        `List files at a branch or commit, ignoring node_modules, dist, build, lockfiles, and binaries. Bounded to ${MCP_LIMITS.fileTreeMaxEntries} entries and depth ${MCP_LIMITS.fileTreeMaxDepth}. Answers reflect the resolved commitHash. Output is JSON.`,
      inputSchema: repoRefSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleGetFileTree(userId, args))
  );

  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description:
        `Read one text file at a branch or commit. Paths are relative to the repository root; path traversal is rejected. Capped at ${MCP_LIMITS.readFileMaxBytes} bytes. Output is JSON with content, size, truncated, and commitHash.`,
      inputSchema: repoRefSchema.extend({
        path: z
          .string()
          .trim()
          .min(1)
          .max(1_024)
          .describe("Repository-relative file path, e.g. src/index.ts")
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleReadFile(userId, args))
  );

  server.registerTool(
    "search_code",
    {
      title: "Search code",
      description:
        `Search file contents at a branch or commit. Literal text by default, or a regular expression when isRegex is true. Bounded to ${MCP_LIMITS.searchMaxMatches} matches across ${MCP_LIMITS.searchMaxFiles} files. Each match includes path, line, and a short snippet. Output is JSON.`,
      inputSchema: repoRefSchema.extend({
        query: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .describe("Text or regular expression to search for"),
        isRegex: z
          .boolean()
          .default(false)
          .describe("When true, treat query as a JavaScript regular expression"),
        maxMatches: z
          .number()
          .int()
          .min(1)
          .max(MCP_LIMITS.searchMaxMatches)
          .optional()
          .describe(`Maximum matches to return (default ${MCP_LIMITS.searchMaxMatches})`)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleSearchCode(userId, args))
  );

  server.registerTool(
    "list_branches",
    {
      title: "List branches",
      description:
        "List branches and tip commit hashes for an owned repository. Output is JSON.",
      inputSchema: z.object({
        repositoryId: repositoryIdField
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleListBranches(userId, args))
  );

  server.registerTool(
    "list_commits",
    {
      title: "List commits",
      description:
        `List recent commits on a branch (default ${MCP_LIMITS.commitsMax}, max ${MCP_LIMITS.commitsMax}). GitHub repositories use the GitHub API; local repositories use a shallow git clone. Output is JSON.`,
      inputSchema: z.object({
        repositoryId: repositoryIdField,
        branch: z.string().trim().min(1).max(200).optional(),
        limit: z
          .number()
          .int()
          .min(1)
          .max(MCP_LIMITS.commitsMax)
          .default(MCP_LIMITS.commitsMax)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleListCommits(userId, args))
  );

  server.registerTool(
    "list_scans",
    {
      title: "List scans",
      description:
        `List recent CodeSense scans for an owned repository (max ${MCP_LIMITS.scansMax}). Output is JSON.`,
      inputSchema: z.object({
        repositoryId: repositoryIdField,
        limit: z
          .number()
          .int()
          .min(1)
          .max(MCP_LIMITS.scansMax)
          .default(MCP_LIMITS.scansMax)
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (args) => runTool(() => handleListScans(userId, args))
  );

  server.registerTool(
    "get_scan",
    {
      title: "Get scan",
      description:
        "Return one owned scan, including summary, AI summary, status, and commit. Output is JSON.",
      inputSchema: z.object({
        scanId: objectIdSchema.describe("Scan id from list_scans")
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (args) => runTool(() => handleGetScan(userId, args))
  );

  server.registerTool(
    "trigger_scan",
    {
      title: "Trigger scan",
      description:
        "Queue a new in-process CodeSense scan for an owned repository branch. Uses the same scan pipeline as the web app. Output is JSON with the queued scan id.",
      inputSchema: z.object({
        repositoryId: repositoryIdField,
        branch: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional()
          .describe("Branch to scan. Defaults to the repository default branch.")
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleTriggerScan(userId, args))
  );

  server.registerTool(
    "get_project_info",
    {
      title: "Project info",
      description:
        "Detect package manager, build/test/lint scripts, entry points, frameworks, config files, and a README excerpt at a branch or commit. Output is JSON and reflects the resolved commitHash.",
      inputSchema: repoRefSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleGetProjectInfo(userId, args))
  );

  server.registerTool(
    "get_dependencies",
    {
      title: "Repository dependencies",
      description:
        `List declared dependencies per manifest (package.json at the root and in apps/* / packages/* workspaces, plus requirements.txt, pyproject.toml, go.mod, Cargo.toml, pom.xml, and build.gradle). Includes dependency/devDependency/peer/optional groups for npm, workspace packages marked internal, lockfile resolved versions when present, and totals. Uses a stored scan for the requested ref when it already has dependency data; otherwise reads the snapshot. Optional workspace filters to one package path. Capped at ${MCP_LIMITS.manifestsMax} manifests and ${MCP_LIMITS.dependenciesMax} entries per group. Output is JSON.`,
      inputSchema: repoRefSchema.extend({
        workspace: z
          .string()
          .trim()
          .min(1)
          .max(512)
          .optional()
          .describe(
            "Optional package path filter, e.g. apps/api or packages/shared. Path traversal is rejected."
          )
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (args) => runTool(() => handleGetDependencies(userId, args))
  );
}
