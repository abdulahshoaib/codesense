import { extname, relative, resolve, sep } from "node:path";

import { ApiError } from "../utils/ApiError.js";
import { BINARY_EXTENSIONS, IGNORED_FILE_NAMES } from "./limits.js";

export function normalizeRelativePath(input: string): string {
  return input.replaceAll("\\", "/").replace(/^\.\/+/, "").trim();
}

export function resolveSafePath(rootDir: string, relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);

  if (!normalized) {
    throw ApiError.badRequest("Path is required", "INVALID_PATH");
  }

  if (
    normalized.startsWith("/") ||
    normalized.startsWith("~") ||
    normalized.split("/").includes("..") ||
    normalized.includes("\0")
  ) {
    throw ApiError.badRequest("Path traversal is not allowed", "PATH_TRAVERSAL");
  }

  const root = resolve(rootDir);
  const resolved = resolve(root, normalized);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;

  if (resolved !== root && !resolved.startsWith(prefix)) {
    throw ApiError.badRequest("Path traversal is not allowed", "PATH_TRAVERSAL");
  }

  return resolved;
}

export function toPosixPath(rootDir: string, absolutePath: string): string {
  return relative(rootDir, absolutePath).split(sep).join("/");
}

export function isIgnoredFileName(name: string): boolean {
  return IGNORED_FILE_NAMES.has(name.toLowerCase());
}

export function isBinaryPath(filePath: string): boolean {
  return BINARY_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function isBinaryContent(content: Buffer): boolean {
  const sample = content.subarray(0, 8_192);
  return sample.includes(0);
}
