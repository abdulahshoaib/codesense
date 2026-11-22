import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";

import { ApiError } from "../utils/ApiError.js";
import { IGNORED_DIRECTORY_NAMES, MCP_LIMITS } from "./limits.js";
import {
  isBinaryContent,
  isBinaryPath,
  isIgnoredFileName,
  resolveSafePath,
  toPosixPath
} from "./paths.js";

export interface FileTreeEntry {
  path: string;
  type: "file" | "directory";
}

export interface FileTreeResult {
  commitHash: string;
  branch: string;
  truncated: boolean;
  entries: FileTreeEntry[];
  limits: {
    maxEntries: number;
    maxDepth: number;
    ignored: string[];
  };
}

export interface ReadFileResult {
  path: string;
  commitHash: string;
  branch: string;
  size: number;
  truncated: boolean;
  content: string;
}

export interface SearchMatch {
  path: string;
  line: number;
  snippet: string;
}

export interface SearchCodeResult {
  commitHash: string;
  branch: string;
  query: string;
  isRegex: boolean;
  truncated: boolean;
  matches: SearchMatch[];
  limits: {
    maxMatches: number;
    maxFiles: number;
  };
}

export interface ProjectInfoResult {
  commitHash: string;
  branch: string;
  packageManager: string | null;
  frameworks: string[];
  scripts: Record<string, string>;
  entryPoints: string[];
  configFiles: string[];
  readmeExcerpt: string | null;
}

async function walkVisible(
  rootDir: string,
  dir: string,
  depth: number,
  maxDepth: number,
  maxEntries: number,
  entries: FileTreeEntry[]
): Promise<boolean> {
  if (entries.length >= maxEntries || depth > maxDepth) {
    return entries.length >= maxEntries || depth > maxDepth;
  }

  const listing = await readdir(dir, { withFileTypes: true });
  listing.sort((left, right) => left.name.localeCompare(right.name));

  let truncated = false;

  for (const entry of listing) {
    if (entries.length >= maxEntries) {
      return true;
    }

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }

      const absolute = join(dir, entry.name);
      entries.push({
        path: toPosixPath(rootDir, absolute),
        type: "directory"
      });
      truncated =
        (await walkVisible(
          rootDir,
          absolute,
          depth + 1,
          maxDepth,
          maxEntries,
          entries
        )) || truncated;
      continue;
    }

    if (!entry.isFile() || isIgnoredFileName(entry.name) || isBinaryPath(entry.name)) {
      continue;
    }

    entries.push({
      path: toPosixPath(rootDir, join(dir, entry.name)),
      type: "file"
    });
  }

  return truncated || entries.length >= maxEntries;
}

export async function listFileTree(
  rootDir: string,
  meta: { commitHash: string; branch: string }
): Promise<FileTreeResult> {
  const entries: FileTreeEntry[] = [];
  const truncated = await walkVisible(
    rootDir,
    rootDir,
    1,
    MCP_LIMITS.fileTreeMaxDepth,
    MCP_LIMITS.fileTreeMaxEntries,
    entries
  );

  return {
    commitHash: meta.commitHash,
    branch: meta.branch,
    truncated,
    entries,
    limits: {
      maxEntries: MCP_LIMITS.fileTreeMaxEntries,
      maxDepth: MCP_LIMITS.fileTreeMaxDepth,
      ignored: ["node_modules", "dist", "build", "bin", "lockfiles", "binaries"]
    }
  };
}

export async function readRepositoryFile(
  rootDir: string,
  relativePath: string,
  meta: { commitHash: string; branch: string }
): Promise<ReadFileResult> {
  const absolute = resolveSafePath(rootDir, relativePath);

  if (isBinaryPath(absolute) || isIgnoredFileName(basename(absolute))) {
    throw ApiError.badRequest("File is not readable text", "FILE_NOT_READABLE");
  }

  const info = await stat(absolute).catch(() => null);

  if (!info || !info.isFile()) {
    throw ApiError.notFound("File not found", "FILE_NOT_FOUND");
  }

  const buffer = await readFile(absolute);

  if (isBinaryContent(buffer)) {
    throw ApiError.badRequest("File is not readable text", "FILE_NOT_READABLE");
  }

  const truncated = buffer.length > MCP_LIMITS.readFileMaxBytes;
  const slice = truncated
    ? buffer.subarray(0, MCP_LIMITS.readFileMaxBytes)
    : buffer;

  return {
    path: normalizeDisplayedPath(relativePath),
    commitHash: meta.commitHash,
    branch: meta.branch,
    size: buffer.length,
    truncated,
    content: slice.toString("utf8")
  };
}

function normalizeDisplayedPath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function compileSearchPattern(query: string, isRegex: boolean): RegExp {
  try {
    return isRegex
      ? new RegExp(query, "g")
      : new RegExp(escapeRegExp(query), "gi");
  } catch {
    throw ApiError.badRequest("Invalid regular expression", "INVALID_REGEX");
  }
}

async function collectSearchFiles(
  rootDir: string,
  dir: string,
  files: string[],
  maxFiles: number
): Promise<void> {
  if (files.length >= maxFiles) {
    return;
  }

  const listing = await readdir(dir, { withFileTypes: true });

  for (const entry of listing) {
    if (files.length >= maxFiles) {
      return;
    }

    const absolute = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
        continue;
      }
      await collectSearchFiles(rootDir, absolute, files, maxFiles);
      continue;
    }

    if (!entry.isFile() || isIgnoredFileName(entry.name) || isBinaryPath(entry.name)) {
      continue;
    }

    files.push(absolute);
  }
}

export async function searchRepositoryCode(
  rootDir: string,
  query: string,
  options: {
    isRegex: boolean;
    maxMatches?: number;
    commitHash: string;
    branch: string;
  }
): Promise<SearchCodeResult> {
  const pattern = compileSearchPattern(query, options.isRegex);
  const maxMatches = Math.min(
    options.maxMatches ?? MCP_LIMITS.searchMaxMatches,
    MCP_LIMITS.searchMaxMatches
  );
  const files: string[] = [];
  await collectSearchFiles(rootDir, rootDir, files, MCP_LIMITS.searchMaxFiles);

  const matches: SearchMatch[] = [];
  let truncated = files.length >= MCP_LIMITS.searchMaxFiles;

  for (const filePath of files) {
    if (matches.length >= maxMatches) {
      truncated = true;
      break;
    }

    const info = await stat(filePath).catch(() => null);
    if (!info || info.size > MCP_LIMITS.searchMaxFileBytes) {
      continue;
    }

    const buffer = await readFile(filePath);
    if (isBinaryContent(buffer)) {
      continue;
    }

    const lines = buffer.toString("utf8").split(/\r?\n/);
    const relative = toPosixPath(rootDir, filePath);

    for (let index = 0; index < lines.length; index += 1) {
      pattern.lastIndex = 0;
      if (!pattern.test(lines[index] ?? "")) {
        continue;
      }

      const start = Math.max(0, index - MCP_LIMITS.searchContextLines);
      const end = Math.min(lines.length, index + MCP_LIMITS.searchContextLines + 1);
      matches.push({
        path: relative,
        line: index + 1,
        snippet: lines.slice(start, end).join("\n")
      });

      if (matches.length >= maxMatches) {
        truncated = true;
        break;
      }
    }
  }

  return {
    commitHash: options.commitHash,
    branch: options.branch,
    query,
    isRegex: options.isRegex,
    truncated,
    matches,
    limits: {
      maxMatches: MCP_LIMITS.searchMaxMatches,
      maxFiles: MCP_LIMITS.searchMaxFiles
    }
  };
}

const MANIFEST_CANDIDATES = [
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "requirements.txt",
  "Pipfile",
  "go.mod",
  "Cargo.toml",
  "composer.json",
  "Gemfile",
  "pom.xml"
];

const README_CANDIDATES = ["README.md", "README.MD", "Readme.md", "README"];

const CONFIG_CANDIDATES = [
  "tsconfig.json",
  "jsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mts",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "nuxt.config.ts",
  "angular.json",
  "svelte.config.js",
  "webpack.config.js",
  "eslint.config.js",
  "eslint.config.ts",
  ".eslintrc.json",
  ".eslintrc.cjs",
  "prettier.config.js",
  ".prettierrc",
  "Dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "Makefile",
  "turbo.json",
  "nx.json"
];

const ENTRY_CANDIDATES = [
  "src/index.ts",
  "src/index.js",
  "src/main.ts",
  "src/main.js",
  "src/app.ts",
  "src/app.js",
  "src/server.ts",
  "src/server.js",
  "index.ts",
  "index.js",
  "app.py",
  "main.py",
  "main.go",
  "cmd/main.go",
  "src/main.rs"
];

const FRAMEWORK_PACKAGES: Record<string, string> = {
  react: "React",
  next: "Next.js",
  vue: "Vue",
  nuxt: "Nuxt",
  svelte: "Svelte",
  "@angular/core": "Angular",
  express: "Express",
  fastify: "Fastify",
  "@nestjs/core": "NestJS",
  hono: "Hono",
  vite: "Vite",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  rails: "Rails",
  laravel: "Laravel"
};

const SCRIPT_KEYS = ["dev", "start", "build", "test", "lint", "typecheck", "preview"];

async function readOptionalFile(
  rootDir: string,
  relativePath: string
): Promise<string | null> {
  try {
    const absolute = resolveSafePath(rootDir, relativePath);
    const buffer = await readFile(absolute);
    if (isBinaryContent(buffer)) {
      return null;
    }
    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

function detectPackageManager(rootFiles: Set<string>): string | null {
  if (rootFiles.has("pnpm-lock.yaml") || rootFiles.has("pnpm-workspace.yaml")) {
    return "pnpm";
  }
  if (rootFiles.has("yarn.lock")) {
    return "yarn";
  }
  if (rootFiles.has("bun.lock") || rootFiles.has("bun.lockb")) {
    return "bun";
  }
  if (rootFiles.has("package-lock.json") || rootFiles.has("package.json")) {
    return "npm";
  }
  if (rootFiles.has("go.mod")) {
    return "go";
  }
  if (rootFiles.has("cargo.toml")) {
    return "cargo";
  }
  if (rootFiles.has("pyproject.toml") || rootFiles.has("requirements.txt")) {
    return rootFiles.has("uv.lock") ? "uv" : "pip";
  }
  if (rootFiles.has("composer.json")) {
    return "composer";
  }
  if (rootFiles.has("gemfile")) {
    return "bundler";
  }
  return null;
}

function parsePackageJson(content: string): {
  scripts: Record<string, string>;
  frameworks: string[];
  entryPoints: string[];
} {
  try {
    const json = JSON.parse(content) as Record<string, unknown>;
    const scripts: Record<string, string> = {};
    const rawScripts =
      typeof json.scripts === "object" && json.scripts !== null
        ? (json.scripts as Record<string, unknown>)
        : {};

    for (const key of SCRIPT_KEYS) {
      const value = rawScripts[key];
      if (typeof value === "string" && value.trim()) {
        scripts[key] = value;
      }
    }

    const dependencyMaps = [json.dependencies, json.devDependencies, json.peerDependencies];
    const names = new Set<string>();
    for (const map of dependencyMaps) {
      if (typeof map === "object" && map !== null) {
        for (const name of Object.keys(map as Record<string, unknown>)) {
          names.add(name);
        }
      }
    }

    const frameworks = Object.entries(FRAMEWORK_PACKAGES)
      .filter(([pkg]) => names.has(pkg))
      .map(([, label]) => label);

    const entryPoints: string[] = [];
    for (const field of ["main", "module", "types"]) {
      const value = json[field];
      if (typeof value === "string" && value.trim()) {
        entryPoints.push(value);
      }
    }

    return { scripts, frameworks, entryPoints };
  } catch {
    return { scripts: {}, frameworks: [], entryPoints: [] };
  }
}

function detectPythonFrameworks(manifest: string): string[] {
  const frameworks: string[] = [];
  const lower = manifest.toLowerCase();
  if (/\bdjango\b/.test(lower)) frameworks.push("Django");
  if (/\bflask\b/.test(lower)) frameworks.push("Flask");
  if (/\bfastapi\b/.test(lower)) frameworks.push("FastAPI");
  return frameworks;
}

export async function inspectProject(
  rootDir: string,
  meta: { commitHash: string; branch: string }
): Promise<ProjectInfoResult> {
  const listing = await readdir(rootDir).catch(() => []);
  const rootFiles = new Set(listing.map((name) => name.toLowerCase()));

  const packageJson = await readOptionalFile(rootDir, "package.json");
  const parsed = packageJson
    ? parsePackageJson(packageJson)
    : { scripts: {}, frameworks: [], entryPoints: [] };

  const pythonManifest =
    (await readOptionalFile(rootDir, "pyproject.toml")) ??
    (await readOptionalFile(rootDir, "requirements.txt"));
  const frameworks = [
    ...parsed.frameworks,
    ...(pythonManifest ? detectPythonFrameworks(pythonManifest) : [])
  ];

  const configFiles: string[] = [];
  for (const name of [...MANIFEST_CANDIDATES, ...CONFIG_CANDIDATES]) {
    if (await readOptionalFile(rootDir, name)) {
      configFiles.push(name);
    }
  }

  const entryPoints = [...parsed.entryPoints];
  for (const candidate of ENTRY_CANDIDATES) {
    if (entryPoints.includes(candidate)) {
      continue;
    }
    if (await readOptionalFile(rootDir, candidate)) {
      entryPoints.push(candidate);
    }
  }

  let readmeExcerpt: string | null = null;
  for (const name of README_CANDIDATES) {
    const content = await readOptionalFile(rootDir, name);
    if (content) {
      readmeExcerpt =
        content.length > MCP_LIMITS.readmeMaxChars
          ? `${content.slice(0, MCP_LIMITS.readmeMaxChars)}\n…[truncated]`
          : content;
      break;
    }
  }

  return {
    commitHash: meta.commitHash,
    branch: meta.branch,
    packageManager: detectPackageManager(rootFiles),
    frameworks: [...new Set(frameworks)],
    scripts: parsed.scripts,
    entryPoints: entryPoints.slice(0, 8),
    configFiles,
    readmeExcerpt
  };
}
