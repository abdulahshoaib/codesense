import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitCheckout {
  commitHash: string;
  committedAt: string;
}

export interface GitCommitSummary {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
}

async function readCheckout(targetDir: string): Promise<GitCheckout> {
  const head = await execFileAsync("git", [
    "-C",
    targetDir,
    "rev-parse",
    "HEAD"
  ]);
  const date = await execFileAsync("git", [
    "-C",
    targetDir,
    "show",
    "-s",
    "--format=%cI",
    "HEAD"
  ]);

  return {
    commitHash: head.stdout.trim(),
    committedAt: date.stdout.trim()
  };
}

export async function cloneBranch(
  url: string,
  branch: string,
  targetDir: string,
  depth = 1
): Promise<GitCheckout> {
  await execFileAsync("git", [
    "clone",
    "--depth",
    String(Math.max(1, depth)),
    "--branch",
    branch,
    "--single-branch",
    url,
    targetDir
  ]);

  return readCheckout(targetDir);
}

export async function cloneCommit(
  url: string,
  commit: string,
  targetDir: string
): Promise<GitCheckout> {
  await mkdir(targetDir, { recursive: true });
  await execFileAsync("git", ["init", "--quiet", targetDir]);
  await execFileAsync("git", [
    "-C",
    targetDir,
    "fetch",
    "--depth",
    "1",
    "--quiet",
    url,
    commit
  ]);
  await execFileAsync("git", [
    "-C",
    targetDir,
    "checkout",
    "--quiet",
    "--detach",
    "FETCH_HEAD"
  ]);

  return readCheckout(targetDir);
}

export async function listCommitsFromRepo(
  repoDir: string,
  limit: number
): Promise<GitCommitSummary[]> {
  const { stdout } = await execFileAsync("git", [
    "-C",
    repoDir,
    "log",
    "-n",
    String(Math.max(1, limit)),
    "--format=%H%x1f%s%x1f%an%x1f%cI"
  ]);

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, message, author, committedAt] = line.split("\x1f");
      return {
        sha: sha ?? "",
        message: message ?? "",
        author: author && author.length > 0 ? author : null,
        committedAt: committedAt ?? ""
      };
    });
}

export async function listRecentCommitsFromRemote(
  url: string,
  branch: string,
  limit: number
): Promise<GitCommitSummary[]> {
  const workDir = await mkdtemp(join(tmpdir(), "codesense-gitlog-"));

  try {
    await execFileAsync("git", [
      "clone",
      "--depth",
      String(Math.max(1, limit)),
      "--branch",
      branch,
      "--single-branch",
      "--no-checkout",
      "--quiet",
      url,
      workDir
    ]);

    return listCommitsFromRepo(workDir, limit);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function listRemoteBranches(
  url: string
): Promise<Array<{ name: string; commitHash: string }>> {
  const { stdout } = await execFileAsync("git", ["ls-remote", "--heads", url]);

  return stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [commitHash, ref] = line.split(/\s+/);
      return {
        commitHash: commitHash ?? "",
        name: (ref ?? "").replace(/^refs\/heads\//, "")
      };
    })
    .filter((branch) => branch.name.length > 0);
}

export async function removeDirectory(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
