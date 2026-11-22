import { readdir, readFile, stat } from "node:fs/promises";

import { detectPackageManager } from "./content.js";
import { IGNORED_DIRECTORY_NAMES, MCP_LIMITS } from "./limits.js";
import {
  isBinaryContent,
  normalizeRelativePath,
  resolveSafePath
} from "./paths.js";

export type DependencyKind =
  | "dependency"
  | "devDependency"
  | "peerDependency"
  | "optionalDependency";

export interface DeclaredDependency {
  name: string;
  declared: string | null;
  resolved?: string;
  internal: boolean;
  kind: DependencyKind;
}

export interface ManifestDependencies {
  path: string;
  ecosystem: string;
  name: string | null;
  dependencies: DeclaredDependency[];
  devDependencies: DeclaredDependency[];
  peerDependencies: DeclaredDependency[];
  optionalDependencies: DeclaredDependency[];
}

export interface DependenciesResult {
  branch: string;
  commitHash: string;
  source: "scan" | "snapshot";
  packageManager: string | null;
  workspace: string | null;
  manifests: ManifestDependencies[];
  totals: {
    manifests: number;
    dependencies: number;
    internal: number;
    truncated: boolean;
  };
}

const DEFAULT_WORKSPACE_GLOBS = ["apps/*", "packages/*"];
const NPM_KINDS: Array<{ field: string; kind: DependencyKind }> = [
  { field: "dependencies", kind: "dependency" },
  { field: "devDependencies", kind: "devDependency" },
  { field: "peerDependencies", kind: "peerDependency" },
  { field: "optionalDependencies", kind: "optionalDependency" }
];

async function readOptionalFile(
  rootDir: string,
  relativePath: string
): Promise<string | null> {
  try {
    const absolute = resolveSafePath(rootDir, relativePath);
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile()) {
      return null;
    }

    const buffer = await readFile(absolute);
    if (isBinaryContent(buffer)) {
      return null;
    }

    if (buffer.length > MCP_LIMITS.lockfileMaxBytes) {
      return buffer.subarray(0, MCP_LIMITS.lockfileMaxBytes).toString("utf8");
    }

    return buffer.toString("utf8");
  } catch {
    return null;
  }
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function isInternalRange(declared: string | null): boolean {
  if (!declared) {
    return false;
  }

  return (
    declared.startsWith("workspace:") ||
    declared.startsWith("file:") ||
    declared.startsWith("link:") ||
    declared === "*"
  );
}

function readNpmRange(value: unknown): {
  declared: string | null;
  internal: boolean;
} {
  if (typeof value === "string") {
    return { declared: value, internal: isInternalRange(value) };
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (record.workspace === true) {
      return { declared: "workspace:*", internal: true };
    }
    if (typeof record.version === "string") {
      return {
        declared: record.version,
        internal: isInternalRange(record.version)
      };
    }
  }

  return { declared: null, internal: false };
}

function capDeps(items: DeclaredDependency[]): DeclaredDependency[] {
  return items.slice(0, MCP_LIMITS.dependenciesMax);
}

function parsePackageJsonManifest(
  relativePath: string,
  content: string,
  workspaceNames: Set<string>,
  resolved: Map<string, string>
): ManifestDependencies | null {
  const json = parseJsonObject(content);
  if (!json) {
    return null;
  }

  const name = typeof json.name === "string" ? json.name : null;
  const groups: Record<DependencyKind, DeclaredDependency[]> = {
    dependency: [],
    devDependency: [],
    peerDependency: [],
    optionalDependency: []
  };

  for (const { field, kind } of NPM_KINDS) {
    const map = json[field];
    if (typeof map !== "object" || map === null) {
      continue;
    }

    for (const [depName, spec] of Object.entries(map as Record<string, unknown>)) {
      const range = readNpmRange(spec);
      const internal = range.internal || workspaceNames.has(depName);
      const resolvedVersion = internal ? undefined : resolved.get(depName);
      groups[kind].push({
        name: depName,
        declared: range.declared,
        ...(resolvedVersion ? { resolved: resolvedVersion } : {}),
        internal,
        kind
      });
    }
  }

  return {
    path: relativePath,
    ecosystem: "npm",
    name,
    dependencies: capDeps(groups.dependency),
    devDependencies: capDeps(groups.devDependency),
    peerDependencies: capDeps(groups.peerDependency),
    optionalDependencies: capDeps(groups.optionalDependency)
  };
}

function parseRequirementsTxt(
  relativePath: string,
  content: string
): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) {
      continue;
    }

    const match = /^([A-Za-z0-9._-]+)\s*(.*)$/.exec(line);
    dependencies.push({
      name: match?.[1] ?? line,
      declared: match?.[2]?.trim() || null,
      internal: false,
      kind: "dependency"
    });
  }

  return {
    path: relativePath,
    ecosystem: "pip",
    name: null,
    dependencies: capDeps(dependencies),
    devDependencies: [],
    peerDependencies: [],
    optionalDependencies: []
  };
}

function parsePyprojectToml(
  relativePath: string,
  content: string
): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];
  const section = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(content)?.[1];

  if (section) {
    const entries = section.match(/["']([^"']+)["']/g) ?? [];
    for (const entry of entries) {
      const value = entry.replace(/^["']|["']$/g, "");
      const match = /^([A-Za-z0-9._-]+)\s*(.*)$/.exec(value);
      dependencies.push({
        name: match?.[1] ?? value,
        declared: match?.[2]?.trim() || null,
        internal: false,
        kind: "dependency"
      });
    }
  }

  return {
    path: relativePath,
    ecosystem: "pip",
    name: null,
    dependencies: capDeps(dependencies),
    devDependencies: [],
    peerDependencies: [],
    optionalDependencies: []
  };
}

function parseGoMod(relativePath: string, content: string): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];
  const lines = content.split("\n");
  let inBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line === "require (") {
      inBlock = true;
      continue;
    }
    if (inBlock && line === ")") {
      inBlock = false;
      continue;
    }
    if (!inBlock && !line.startsWith("require ")) {
      continue;
    }
    const moduleLine = inBlock ? line : line.slice("require ".length).trim();
    const match = /^(\S+)\s+(\S+)/.exec(moduleLine);
    if (match) {
      dependencies.push({
        name: match[1],
        declared: match[2],
        internal: false,
        kind: "dependency"
      });
    }
  }

  return {
    path: relativePath,
    ecosystem: "go",
    name: null,
    dependencies: capDeps(dependencies),
    devDependencies: [],
    peerDependencies: [],
    optionalDependencies: []
  };
}

function parseCargoToml(
  relativePath: string,
  content: string
): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];
  const devDependencies: DeclaredDependency[] = [];
  const lines = content.split("\n");
  let section: "dependencies" | "dev" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith("[") && line.endsWith("]")) {
      if (line === "[dependencies]") {
        section = "dependencies";
      } else if (line === "[dev-dependencies]") {
        section = "dev";
      } else {
        section = null;
      }
      continue;
    }
    if (!section || !line || line.startsWith("#")) {
      continue;
    }
    const equals = line.indexOf("=");
    if (equals === -1) {
      continue;
    }
    const name = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    const versionMatch = /(?:version\s*=\s*)?"([^"]+)"/.exec(value);
    const item: DeclaredDependency = {
      name,
      declared: versionMatch?.[1] ?? (value.replace(/^"|"$/g, "") || null),
      internal: false,
      kind: section === "dev" ? "devDependency" : "dependency"
    };
    if (section === "dev") {
      devDependencies.push(item);
    } else {
      dependencies.push(item);
    }
  }

  return {
    path: relativePath,
    ecosystem: "cargo",
    name: null,
    dependencies: capDeps(dependencies),
    devDependencies: capDeps(devDependencies),
    peerDependencies: [],
    optionalDependencies: []
  };
}

function parsePomXml(relativePath: string, content: string): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];
  const blockPattern = /<dependency>([\s\S]*?)<\/dependency>/g;
  let block: RegExpExecArray | null;

  while ((block = blockPattern.exec(content)) !== null) {
    const body = block[1];
    const artifact = /<artifactId>([^<]+)<\/artifactId>/.exec(body)?.[1];
    const version = /<version>([^<]+)<\/version>/.exec(body)?.[1];
    if (artifact) {
      dependencies.push({
        name: artifact,
        declared: version ?? null,
        internal: false,
        kind: "dependency"
      });
    }
  }

  return {
    path: relativePath,
    ecosystem: "maven",
    name: null,
    dependencies: capDeps(dependencies),
    devDependencies: [],
    peerDependencies: [],
    optionalDependencies: []
  };
}

function parseBuildGradle(
  relativePath: string,
  content: string
): ManifestDependencies {
  const dependencies: DeclaredDependency[] = [];
  const pattern =
    /(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(['"]([^'"]+)['"]\)|['"]([^'"]+)['"])/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const spec = match[1] ?? match[2] ?? "";
    const parts = spec.split(":");
    const name = parts.length >= 2 ? parts[1] : spec;
    const version = parts.length >= 3 ? parts[2] : null;
    const kind: DependencyKind = match[0].includes("testImplementation")
      ? "devDependency"
      : "dependency";
    dependencies.push({
      name,
      declared: version,
      internal: false,
      kind
    });
  }

  const prod = dependencies.filter((item) => item.kind === "dependency");
  const dev = dependencies.filter((item) => item.kind === "devDependency");

  return {
    path: relativePath,
    ecosystem: "gradle",
    name: null,
    dependencies: capDeps(prod),
    devDependencies: capDeps(dev),
    peerDependencies: [],
    optionalDependencies: []
  };
}

function workspaceGlobsFromPackageJson(content: string): string[] {
  const json = parseJsonObject(content);
  if (!json) {
    return [];
  }

  if (Array.isArray(json.workspaces)) {
    return json.workspaces.filter((item): item is string => typeof item === "string");
  }

  if (typeof json.workspaces === "object" && json.workspaces !== null) {
    const packages = (json.workspaces as Record<string, unknown>).packages;
    if (Array.isArray(packages)) {
      return packages.filter((item): item is string => typeof item === "string");
    }
  }

  return [];
}

function workspaceGlobsFromPnpmYaml(content: string): string[] {
  const globs: string[] = [];
  let inPackages = false;

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("packages:")) {
      inPackages = true;
      continue;
    }
    if (inPackages && /^[A-Za-z]/.test(line) && !line.startsWith("-")) {
      break;
    }
    if (inPackages) {
      const match = /^-\s*['"]?([^'"]+)['"]?/.exec(line);
      if (match?.[1]) {
        globs.push(match[1]);
      }
    }
  }

  return globs;
}

async function expandGlob(rootDir: string, pattern: string): Promise<string[]> {
  const normalized = normalizeRelativePath(pattern);
  if (!normalized || normalized.split("/").includes("..")) {
    return [];
  }

  if (!normalized.endsWith("/*")) {
    return [normalized];
  }

  const dir = normalized.slice(0, -2);
  const absolute = dir.length > 0 ? resolveSafePath(rootDir, dir) : rootDir;
  const entries = await readdir(absolute, { withFileTypes: true }).catch(
    () => []
  );

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && !IGNORED_DIRECTORY_NAMES.has(entry.name)
    )
    .map((entry) => (dir.length > 0 ? `${dir}/${entry.name}` : entry.name));
}

function matchesWorkspaceFilter(
  manifestDir: string,
  filter: string | undefined
): boolean {
  if (!filter) {
    return true;
  }

  const normalized = normalizeRelativePath(filter);
  if (!normalized || normalized === ".") {
    return manifestDir === "." || manifestDir === "";
  }

  return manifestDir === normalized || manifestDir.startsWith(`${normalized}/`);
}

function parseNpmLockResolved(content: string): Map<string, string> {
  const resolved = new Map<string, string>();
  const json = parseJsonObject(content);
  if (!json) {
    return resolved;
  }

  const packages = json.packages;
  if (typeof packages === "object" && packages !== null) {
    for (const [key, value] of Object.entries(
      packages as Record<string, unknown>
    )) {
      if (typeof value !== "object" || value === null) {
        continue;
      }
      const version = (value as Record<string, unknown>).version;
      if (typeof version !== "string") {
        continue;
      }
      const name = key.replace(/^node_modules\//, "");
      if (name && !name.includes("/node_modules/") && !resolved.has(name)) {
        resolved.set(name, version);
      }
    }
  }

  const dependencies = json.dependencies;
  if (typeof dependencies === "object" && dependencies !== null) {
    for (const [name, value] of Object.entries(
      dependencies as Record<string, unknown>
    )) {
      if (typeof value === "object" && value !== null) {
        const version = (value as Record<string, unknown>).version;
        if (typeof version === "string" && !resolved.has(name)) {
          resolved.set(name, version);
        }
      }
    }
  }

  return resolved;
}

function parsePnpmLockResolved(content: string): Map<string, string> {
  const resolved = new Map<string, string>();
  let currentDep: string | null = null;

  for (const raw of content.split("\n")) {
    const depMatch = /^ {6}(\S+):$/.exec(raw);
    if (depMatch) {
      currentDep = depMatch[1].replace(/^['"]|['"]$/g, "");
      continue;
    }

    const versionMatch = /^ {8}version:\s+(\S+)$/.exec(raw);
    if (versionMatch && currentDep && !resolved.has(currentDep)) {
      resolved.set(
        currentDep,
        versionMatch[1].replace(/^['"]|['"]$/g, "")
      );
      currentDep = null;
    }
  }

  return resolved;
}

function emptyManifest(
  relativePath: string,
  ecosystem: string,
  name: string | null
): ManifestDependencies {
  return {
    path: relativePath,
    ecosystem,
    name,
    dependencies: [],
    devDependencies: [],
    peerDependencies: [],
    optionalDependencies: []
  };
}

function countDeps(manifest: ManifestDependencies): {
  dependencies: number;
  internal: number;
} {
  const all = [
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
    ...manifest.optionalDependencies
  ];
  return {
    dependencies: all.length,
    internal: all.filter((item) => item.internal).length
  };
}

async function collectWorkspaceDirs(rootDir: string): Promise<string[]> {
  const dirs = new Set<string>(["."]);
  const packageJson = await readOptionalFile(rootDir, "package.json");
  const pnpmWorkspace = await readOptionalFile(rootDir, "pnpm-workspace.yaml");
  const globs = [
    ...(packageJson ? workspaceGlobsFromPackageJson(packageJson) : []),
    ...(pnpmWorkspace ? workspaceGlobsFromPnpmYaml(pnpmWorkspace) : []),
    ...DEFAULT_WORKSPACE_GLOBS
  ];

  for (const glob of globs) {
    const expanded = await expandGlob(rootDir, glob);
    for (const dir of expanded) {
      dirs.add(dir);
    }
  }

  return [...dirs];
}

async function parseManifestAt(
  rootDir: string,
  dir: string,
  fileName: string,
  workspaceNames: Set<string>,
  resolved: Map<string, string>
): Promise<ManifestDependencies | null> {
  const relativePath = dir === "." ? fileName : `${dir}/${fileName}`;
  const content = await readOptionalFile(rootDir, relativePath);
  if (content === null) {
    return null;
  }

  switch (fileName) {
    case "package.json":
      return parsePackageJsonManifest(
        relativePath,
        content,
        workspaceNames,
        resolved
      );
    case "requirements.txt":
      return parseRequirementsTxt(relativePath, content);
    case "pyproject.toml":
      return parsePyprojectToml(relativePath, content);
    case "go.mod":
      return parseGoMod(relativePath, content);
    case "Cargo.toml":
      return parseCargoToml(relativePath, content);
    case "pom.xml":
      return parsePomXml(relativePath, content);
    case "build.gradle":
    case "build.gradle.kts":
      return parseBuildGradle(relativePath, content);
    default:
      return emptyManifest(relativePath, "unknown", null);
  }
}

const MANIFEST_FILES = [
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts"
];

export function dependenciesFromScan(
  dependencies: Array<{ ecosystem: string; name: string; version?: string }>,
  meta: { commitHash: string; branch: string }
): DependenciesResult {
  const byEcosystem = new Map<string, DeclaredDependency[]>();

  for (const item of dependencies.slice(0, MCP_LIMITS.dependenciesMax * MCP_LIMITS.manifestsMax)) {
    const list = byEcosystem.get(item.ecosystem) ?? [];
    list.push({
      name: item.name,
      declared: item.version ?? null,
      ...(item.version ? { resolved: item.version } : {}),
      internal: false,
      kind: "dependency"
    });
    byEcosystem.set(item.ecosystem, list);
  }

  const manifests: ManifestDependencies[] = [...byEcosystem.entries()].map(
    ([ecosystem, items]) => ({
      path: "(scan)",
      ecosystem,
      name: null,
      dependencies: capDeps(items),
      devDependencies: [],
      peerDependencies: [],
      optionalDependencies: []
    })
  );

  const truncated =
    dependencies.length > MCP_LIMITS.dependenciesMax * MCP_LIMITS.manifestsMax ||
    manifests.some(
      (manifest) => manifest.dependencies.length >= MCP_LIMITS.dependenciesMax
    );

  let dependencyCount = 0;
  for (const manifest of manifests) {
    dependencyCount += countDeps(manifest).dependencies;
  }

  const packageManager =
    byEcosystem.size === 1 && byEcosystem.has("npm") ? "npm" : null;

  return {
    branch: meta.branch,
    commitHash: meta.commitHash,
    source: "scan",
    packageManager,
    workspace: null,
    manifests,
    totals: {
      manifests: manifests.length,
      dependencies: dependencyCount,
      internal: 0,
      truncated
    }
  };
}

export async function collectDependencies(
  rootDir: string,
  meta: { commitHash: string; branch: string },
  workspaceFilter?: string
): Promise<DependenciesResult> {
  if (workspaceFilter) {
    resolveSafePath(rootDir, workspaceFilter);
  }

  const listing = await readdir(rootDir).catch(() => []);
  const rootFiles = new Set(listing.map((name) => name.toLowerCase()));
  const packageManager = detectPackageManager(rootFiles);

  let resolved = new Map<string, string>();
  const pnpmLock = await readOptionalFile(rootDir, "pnpm-lock.yaml");
  if (pnpmLock) {
    resolved = parsePnpmLockResolved(pnpmLock);
  } else {
    const npmLock = await readOptionalFile(rootDir, "package-lock.json");
    if (npmLock) {
      resolved = parseNpmLockResolved(npmLock);
    }
  }

  const dirs = await collectWorkspaceDirs(rootDir);
  const workspaceNames = new Set<string>();

  for (const dir of dirs) {
    const relative = dir === "." ? "package.json" : `${dir}/package.json`;
    const content = await readOptionalFile(rootDir, relative);
    if (!content) {
      continue;
    }
    const json = parseJsonObject(content);
    if (typeof json?.name === "string") {
      workspaceNames.add(json.name);
    }
  }

  const manifests: ManifestDependencies[] = [];
  let truncated = false;

  for (const dir of dirs) {
    if (!matchesWorkspaceFilter(dir, workspaceFilter)) {
      continue;
    }

    for (const fileName of MANIFEST_FILES) {
      if (manifests.length >= MCP_LIMITS.manifestsMax) {
        truncated = true;
        break;
      }

      const parsed = await parseManifestAt(
        rootDir,
        dir,
        fileName,
        workspaceNames,
        resolved
      );
      if (!parsed) {
        continue;
      }

      const counts = countDeps(parsed);
      if (
        counts.dependencies === 0 &&
        fileName !== "package.json" &&
        dir !== "."
      ) {
        continue;
      }

      if (counts.dependencies >= MCP_LIMITS.dependenciesMax) {
        truncated = true;
      }

      manifests.push(parsed);
    }
    if (truncated) {
      break;
    }
  }

  let dependencyCount = 0;
  let internalCount = 0;
  for (const manifest of manifests) {
    const counts = countDeps(manifest);
    dependencyCount += counts.dependencies;
    internalCount += counts.internal;
  }

  return {
    branch: meta.branch,
    commitHash: meta.commitHash,
    source: "snapshot",
    packageManager,
    workspace: workspaceFilter ? normalizeRelativePath(workspaceFilter) : null,
    manifests,
    totals: {
      manifests: manifests.length,
      dependencies: dependencyCount,
      internal: internalCount,
      truncated
    }
  };
}
