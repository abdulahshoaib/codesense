import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitCheckout {
  commitHash: string;
  committedAt: string;
}

export async function cloneBranch(
  url: string,
  branch: string,
  targetDir: string
): Promise<GitCheckout> {
  await execFileAsync("git", [
    "clone",
    "--depth",
    "1",
    "--branch",
    branch,
    "--single-branch",
    url,
    targetDir
  ]);

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

export async function removeDirectory(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
