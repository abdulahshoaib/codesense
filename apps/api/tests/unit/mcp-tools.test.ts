import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listRepositories: vi.fn(),
  getRepository: vi.fn(),
  getOwnedRepository: vi.fn(),
  listBranches: vi.fn(),
  listLatestByRepository: vi.fn(),
  getLatestScanForRepository: vi.fn(),
  listScansForRepository: vi.fn(),
  getScan: vi.fn(),
  createScan: vi.fn(),
  resolveSnapshot: vi.fn(),
  resolveHeadCommit: vi.fn(),
  getGithubAccessToken: vi.fn(),
  listGithubCommits: vi.fn(),
  listRecentCommitsFromRemote: vi.fn()
}));

vi.mock("../../src/modules/repositories/repository.service.js", () => ({
  repositoryService: {
    listRepositories: mocks.listRepositories,
    getRepository: mocks.getRepository,
    getOwnedRepository: mocks.getOwnedRepository,
    listBranches: mocks.listBranches
  }
}));

vi.mock("../../src/modules/scans/scan.service.js", () => ({
  scanService: {
    listLatestByRepository: mocks.listLatestByRepository,
    getLatestScanForRepository: mocks.getLatestScanForRepository,
    listScansForRepository: mocks.listScansForRepository,
    getScan: mocks.getScan,
    createScan: mocks.createScan
  }
}));

vi.mock("../../src/mcp/snapshot.js", () => ({
  resolveSnapshot: mocks.resolveSnapshot,
  resolveHeadCommit: mocks.resolveHeadCommit
}));

vi.mock("../../src/modules/github/github.service.js", () => ({
  getGithubAccessToken: mocks.getGithubAccessToken,
  listGithubCommits: mocks.listGithubCommits
}));

vi.mock("../../src/services/git.service.js", () => ({
  listRecentCommitsFromRemote: mocks.listRecentCommitsFromRemote
}));

const {
  handleGetFileTree,
  handleGetProjectInfo,
  handleGetRepositoryOverview,
  handleGetScan,
  handleListBranches,
  handleListCommits,
  handleListRepositories,
  handleListScans,
  handleReadFile,
  handleSearchCode,
  handleTriggerScan
} = await import("../../src/mcp/tools.js");
const { ApiError } = await import("../../src/utils/ApiError.js");

const ownerId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439099";
const repositoryId = "507f1f77bcf86cd799439012";
const scanId = "507f1f77bcf86cd799439013";

const repository = {
  id: repositoryId,
  ownerId,
  name: "codesense",
  url: "https://github.com/ada/codesense",
  provider: "github" as const,
  defaultBranch: "main",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("mcp tool handlers", () => {
  let rootDir = "";

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-tools-"));
    await mkdir(join(rootDir, "src"), { recursive: true });
    await writeFile(join(rootDir, "src", "index.ts"), "export const value = 42;\n");
    await writeFile(
      join(rootDir, "package.json"),
      JSON.stringify({
        name: "codesense",
        scripts: { test: "vitest" },
        dependencies: { react: "19.0.0" }
      })
    );
    mocks.resolveSnapshot.mockResolvedValue({
      repositoryId,
      branch: "main",
      commitHash: "deadbeef",
      rootDir
    });
    mocks.listRepositories.mockResolvedValue([repository]);
    mocks.getRepository.mockResolvedValue(repository);
    mocks.getOwnedRepository.mockResolvedValue({
      ...repository,
      _id: { toString: () => repositoryId }
    });
    mocks.listBranches.mockResolvedValue([
      { name: "main", commitHash: "cafed00d" }
    ]);
    mocks.listLatestByRepository.mockResolvedValue(new Map());
    mocks.getLatestScanForRepository.mockResolvedValue(null);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("lists only the authenticated user's repositories", async () => {
    const result = (await handleListRepositories(ownerId)) as {
      repositories: Array<{ id: string }>;
    };

    expect(mocks.listRepositories).toHaveBeenCalledWith(ownerId);
    expect(result.repositories).toHaveLength(1);
    expect(result.repositories[0]?.id).toBe(repositoryId);
  });

  it("reports scan staleness against the branch head", async () => {
    mocks.resolveHeadCommit.mockResolvedValue("cafed00d");
    mocks.getLatestScanForRepository.mockResolvedValue({
      id: scanId,
      commitHash: "oldcommit",
      status: "completed",
      branch: "main",
      summary: {
        files: 3,
        linesOfCode: 10,
        languages: [{ name: "TypeScript", files: 3, lines: 10 }],
        dependencies: Array.from({ length: 80 }, (_, index) => ({
          ecosystem: "npm",
          name: `pkg-${index}`
        }))
      },
      aiSummary: "x".repeat(5000)
    });

    const result = (await handleGetRepositoryOverview(ownerId, {
      repositoryId
    })) as {
      stale: boolean;
      dependencies: unknown[];
      aiSummary: string;
    };

    expect(result.stale).toBe(true);
    expect(result.dependencies).toHaveLength(40);
    expect(result.aiSummary.endsWith("…[truncated]")).toBe(true);
  });

  it("rejects another user's repository", async () => {
    mocks.getRepository.mockRejectedValue(
      ApiError.notFound("Repository not found", "REPOSITORY_NOT_FOUND")
    );

    await expect(
      handleGetRepositoryOverview(otherUserId, { repositoryId })
    ).rejects.toMatchObject({ code: "REPOSITORY_NOT_FOUND" });
  });

  it("reads files from the snapshot and rejects traversal", async () => {
    const file = (await handleReadFile(ownerId, {
      repositoryId,
      path: "src/index.ts"
    })) as { content: string; commitHash: string };

    expect(file.content).toContain("value = 42");
    expect(file.commitHash).toBe("deadbeef");

    await expect(
      handleReadFile(ownerId, { repositoryId, path: "../secret" })
    ).rejects.toMatchObject({ code: "PATH_TRAVERSAL" });
  });

  it("returns a file tree for the resolved commit", async () => {
    const tree = (await handleGetFileTree(ownerId, { repositoryId })) as {
      commitHash: string;
      entries: Array<{ path: string }>;
    };

    expect(tree.commitHash).toBe("deadbeef");
    expect(tree.entries.some((entry) => entry.path === "src/index.ts")).toBe(true);
  });

  it("searches code with bounded matches", async () => {
    const result = (await handleSearchCode(ownerId, {
      repositoryId,
      query: "value = 42",
      isRegex: false
    })) as { matches: Array<{ path: string; line: number }> };

    expect(result.matches[0]?.path).toBe("src/index.ts");
    expect(result.matches[0]?.line).toBe(1);
  });

  it("lists branches through the repository service", async () => {
    const result = (await handleListBranches(ownerId, { repositoryId })) as {
      branches: Array<{ name: string }>;
    };
    expect(result.branches[0]?.name).toBe("main");
  });

  it("lists github commits without exposing the access token", async () => {
    mocks.getGithubAccessToken.mockResolvedValue("gho_secret");
    mocks.listGithubCommits.mockResolvedValue([
      {
        sha: "aaa",
        message: "feat: hello\n\nbody",
        author: "ada",
        committedAt: "2026-11-01T00:00:00.000Z",
        url: "https://github.com/ada/codesense/commit/aaa"
      }
    ]);

    const result = (await handleListCommits(ownerId, {
      repositoryId,
      limit: 20
    })) as { commits: unknown; source: string };

    expect(result.source).toBe("github");
    expect(JSON.stringify(result)).not.toContain("gho_secret");
    expect(mocks.listGithubCommits).toHaveBeenCalledWith(
      "gho_secret",
      repository.url,
      "main"
    );
  });

  it("caps scan lists and returns scan details for the owner", async () => {
    mocks.listScansForRepository.mockResolvedValue(
      Array.from({ length: 30 }, (_, index) => ({
        id: `scan-${index}`,
        status: "completed",
        branch: "main",
        commitHash: "abc"
      }))
    );
    mocks.getScan.mockResolvedValue({
      id: scanId,
      ownerId,
      repositoryId,
      status: "completed",
      branch: "main",
      summary: {
        files: 1,
        linesOfCode: 1,
        languages: [],
        dependencies: []
      }
    });

    const listed = (await handleListScans(ownerId, {
      repositoryId,
      limit: 25
    })) as { scans: unknown[]; truncated: boolean };
    expect(listed.scans).toHaveLength(25);
    expect(listed.truncated).toBe(true);

    const scan = (await handleGetScan(ownerId, { scanId })) as { id: string };
    expect(scan.id).toBe(scanId);
    expect(mocks.getScan).toHaveBeenCalledWith(ownerId, scanId);
  });

  it("triggers a scan using existing scan logic", async () => {
    mocks.createScan.mockResolvedValue({
      id: scanId,
      status: "queued",
      branch: "main",
      repositoryId
    });

    const result = (await handleTriggerScan(ownerId, { repositoryId })) as {
      status: string;
    };
    expect(result.status).toBe("queued");
    expect(mocks.createScan).toHaveBeenCalledWith(ownerId, repositoryId, {
      branch: "main"
    });
  });

  it("returns project info from the snapshot", async () => {
    const info = (await handleGetProjectInfo(ownerId, { repositoryId })) as {
      packageManager: string | null;
      frameworks: string[];
      commitHash: string;
    };

    expect(info.commitHash).toBe("deadbeef");
    expect(info.packageManager).toBe("npm");
    expect(info.frameworks).toContain("React");
  });
});
