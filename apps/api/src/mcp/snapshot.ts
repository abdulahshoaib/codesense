import { access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { logger } from "../config/logger.js";
import { repositoryService } from "../modules/repositories/repository.service.js";
import type { RepositoryDocument } from "../modules/repositories/repository.types.js";
import {
  buildGithubCloneUrl,
  getGithubAccessToken
} from "../modules/github/github.service.js";
import {
  cloneBranch,
  cloneCommit,
  removeDirectory
} from "../services/git.service.js";
import { ApiError } from "../utils/ApiError.js";
import { MCP_LIMITS } from "./limits.js";

export interface RepoSnapshot {
  repositoryId: string;
  branch: string;
  commitHash: string;
  rootDir: string;
}

interface CacheEntry {
  snapshot: RepoSnapshot;
  lastUsedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<RepoSnapshot>>();

function sanitize(message: string, secret?: string): string {
  if (!secret) {
    return message;
  }

  return message.split(secret).join("***");
}

function cacheKey(ownerId: string, repositoryId: string, commitHash: string): string {
  return `${ownerId}:${repositoryId}:${commitHash}`;
}

async function evictStale(): Promise<void> {
  const now = Date.now();
  const expired: string[] = [];

  for (const [key, entry] of cache.entries()) {
    if (now - entry.lastUsedAt > MCP_LIMITS.cloneTtlMs) {
      expired.push(key);
    }
  }

  while (cache.size - expired.length >= MCP_LIMITS.cloneMaxEntries) {
    let oldestKey: string | undefined;
    let oldestTime = Number.POSITIVE_INFINITY;

    for (const [key, entry] of cache.entries()) {
      if (expired.includes(key)) {
        continue;
      }
      if (entry.lastUsedAt < oldestTime) {
        oldestTime = entry.lastUsedAt;
        oldestKey = key;
      }
    }

    if (!oldestKey) {
      break;
    }

    expired.push(oldestKey);
  }

  for (const key of expired) {
    const entry = cache.get(key);
    cache.delete(key);
    if (entry) {
      await removeDirectory(entry.snapshot.rootDir).catch(() => undefined);
    }
  }
}

async function resolveCloneUrl(
  ownerId: string,
  repository: RepositoryDocument
): Promise<{ url: string; secret?: string }> {
  if (repository.provider !== "github") {
    return { url: repository.url };
  }

  const accessToken = await getGithubAccessToken(ownerId);
  return {
    url: buildGithubCloneUrl(repository.url, accessToken),
    secret: accessToken
  };
}

async function materialize(
  ownerId: string,
  repository: RepositoryDocument,
  branch: string,
  commitHash: string | undefined
): Promise<RepoSnapshot> {
  const { url, secret } = await resolveCloneUrl(ownerId, repository);
  const rootDir = join(
    tmpdir(),
    "codesense-mcp",
    `${ownerId}-${repository._id.toString()}-${commitHash ?? branch}`
  );

  try {
    await access(join(rootDir, ".git"));
    return {
      repositoryId: repository._id.toString(),
      branch,
      commitHash: commitHash ?? "HEAD",
      rootDir
    };
  } catch {
    await removeDirectory(rootDir).catch(() => undefined);
  }

  try {
    const checkout = commitHash
      ? await cloneCommit(url, commitHash, rootDir)
      : await cloneBranch(url, branch, rootDir);

    return {
      repositoryId: repository._id.toString(),
      branch,
      commitHash: checkout.commitHash,
      rootDir
    };
  } catch (error) {
    await removeDirectory(rootDir).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Clone failed";
    logger.warn({ error, repositoryId: repository._id.toString() }, "MCP clone failed");
    throw ApiError.internal(sanitize(message, secret), "MCP_CLONE_FAILED");
  }
}

export async function resolveSnapshot(
  ownerId: string,
  repositoryId: string,
  options: { branch?: string; commit?: string } = {}
): Promise<RepoSnapshot> {
  const repository = await repositoryService.getOwnedRepository(
    ownerId,
    repositoryId
  );
  const branch = options.branch?.trim() || repository.defaultBranch;
  let commitHash = options.commit?.trim() || undefined;

  if (!commitHash) {
    const branches = await repositoryService.listBranches(ownerId, repositoryId);
    const match = branches.find((item) => item.name === branch);
    commitHash = match?.commitHash || undefined;
  }

  const key = cacheKey(ownerId, repositoryId, commitHash ?? `${branch}:head`);
  const cached = cache.get(key);

  if (cached) {
    cached.lastUsedAt = Date.now();
    return cached.snapshot;
  }

  const pending = inflight.get(key);
  if (pending) {
    return pending;
  }

  const task = (async () => {
    await evictStale();
    const snapshot = await materialize(ownerId, repository, branch, commitHash);
    cache.set(cacheKey(ownerId, repositoryId, snapshot.commitHash), {
      snapshot,
      lastUsedAt: Date.now()
    });
    return snapshot;
  })();

  inflight.set(key, task);

  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

export async function resolveHeadCommit(
  ownerId: string,
  repositoryId: string,
  branch: string
): Promise<string | null> {
  const branches = await repositoryService.listBranches(ownerId, repositoryId);
  return branches.find((item) => item.name === branch)?.commitHash ?? null;
}

export function resetSnapshotCache(): void {
  cache.clear();
  inflight.clear();
}
