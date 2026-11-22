import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type {
  DependencySummary,
  LanguageSummary,
  ScanSummary
} from "@codesense/shared";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".hg",
  ".svn",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  ".yarn",
  ".pnpm-store",
  "__pycache__",
  "node_modules",
  "bower_components",
  "vendor",
  "target",
  "dist",
  "build",
  "coverage",
  "out",
  ".venv",
  "venv",
  "bin",
  "obj"
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cc": "C++",
  ".cxx": "C++",
  ".hpp": "C++",
  ".cs": "C#",
  ".php": "PHP",
  ".swift": "Swift",
  ".scala": "Scala",
  ".m": "Objective-C",
  ".mm": "Objective-C",
  ".sh": "Shell",
  ".bash": "Shell",
  ".zsh": "Shell",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".scss": "SCSS",
  ".less": "LESS",
  ".sass": "Sass",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".sql": "SQL",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".md": "Markdown",
  ".mdx": "Markdown",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".proto": "Protocol Buffers",
  ".lua": "Lua",
  ".r": "R",
  ".dart": "Dart",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".erl": "Erlang",
  ".hs": "Haskell",
  ".clj": "Clojure",
  ".groovy": "Groovy",
  ".gradle": "Groovy",
  ".tf": "HCL",
  ".dockerfile": "Dockerfile"
};

interface ManifestParser {
  ecosystem: string;
  parse(content: string): DependencySummary[];
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

function parseVersionedMap(
  value: unknown,
  ecosystem: string
): DependencySummary[] {
  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).map(([name, version]) => ({
    ecosystem,
    name,
    ...(typeof version === "string" ? { version } : {})
  }));
}

function parsePackageJson(content: string): DependencySummary[] {
  const json = parseJsonObject(content);
  if (!json) {
    return [];
  }

  return [
    ...parseVersionedMap(json.dependencies, "npm"),
    ...parseVersionedMap(json.devDependencies, "npm"),
    ...parseVersionedMap(json.peerDependencies, "npm")
  ];
}

function parseRequirementsTxt(content: string): DependencySummary[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
    .map((line) => {
      const match = /^([A-Za-z0-9._-]+)\s*(.*)$/.exec(line);
      const name = match?.[1] ?? line;
      const version = match?.[2]
        ?.trim()
        .replace(/^(===|==|!=|~=|>=|<=|>|<)\s*/, "");

      return {
        ecosystem: "pip",
        name,
        ...(version ? { version } : {})
      };
    });
}

function parseGoMod(content: string): DependencySummary[] {
  const dependencies: DependencySummary[] = [];
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
    const match = /^(\S+)\s+(\S+)$/.exec(moduleLine);

    if (match) {
      dependencies.push({ ecosystem: "go", name: match[1], version: match[2] });
    }
  }

  return dependencies;
}

function parseGemfile(content: string): DependencySummary[] {
  const dependencies: DependencySummary[] = [];
  const pattern = /gem\s+["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    dependencies.push({
      ecosystem: "rubygems",
      name: match[1],
      ...(match[2] ? { version: match[2] } : {})
    });
  }

  return dependencies;
}

function parseComposerJson(content: string): DependencySummary[] {
  const json = parseJsonObject(content);
  if (!json) {
    return [];
  }

  return [
    ...parseVersionedMap(json.require, "composer"),
    ...parseVersionedMap(json["require-dev"], "composer")
  ];
}

function parseCargoToml(content: string): DependencySummary[] {
  const dependencies: DependencySummary[] = [];
  const lines = content.split("\n");
  let inDependencies = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("[") && line.endsWith("]")) {
      inDependencies = line === "[dependencies]";
      continue;
    }

    if (!inDependencies || !line) {
      continue;
    }

    const equals = line.indexOf("=");
    if (equals === -1) {
      continue;
    }

    const name = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim();
    const versionMatch = /(?:version\s*=\s*)?"([^"]+)"/.exec(value);

    dependencies.push({
      ecosystem: "cargo",
      name,
      ...(versionMatch ? { version: versionMatch[1] } : {})
    });
  }

  return dependencies;
}

function parsePomXml(content: string): DependencySummary[] {
  const dependencies: DependencySummary[] = [];
  const blockPattern = /<dependency>([\s\S]*?)<\/dependency>/g;
  let block: RegExpExecArray | null;

  while ((block = blockPattern.exec(content)) !== null) {
    const body = block[1];
    const artifact = /<artifactId>([^<]+)<\/artifactId>/.exec(body)?.[1];
    const version = /<version>([^<]+)<\/version>/.exec(body)?.[1];

    if (artifact) {
      dependencies.push({
        ecosystem: "maven",
        name: artifact,
        ...(version ? { version } : {})
      });
    }
  }

  return dependencies;
}

function parsePyprojectToml(content: string): DependencySummary[] {
  const dependencies: DependencySummary[] = [];
  const section = /dependencies\s*=\s*\[([\s\S]*?)\]/.exec(content)?.[1];

  if (!section) {
    return [];
  }

  const entries = section.match(/["']([^"']+)["']/g) ?? [];

  for (const entry of entries) {
    const value = entry.replace(/^["']|["']$/g, "");
    const match = /^([A-Za-z0-9._-]+)\s*(.*)$/.exec(value);

    dependencies.push({
      ecosystem: "pip",
      name: match?.[1] ?? value,
      ...(match?.[2]?.trim() ? { version: match[2].trim() } : {})
    });
  }

  return dependencies;
}

const MANIFEST_PARSERS: Record<string, ManifestParser> = {
  "package.json": { ecosystem: "npm", parse: parsePackageJson },
  "requirements.txt": { ecosystem: "pip", parse: parseRequirementsTxt },
  "go.mod": { ecosystem: "go", parse: parseGoMod },
  Gemfile: { ecosystem: "rubygems", parse: parseGemfile },
  "composer.json": { ecosystem: "composer", parse: parseComposerJson },
  "Cargo.toml": { ecosystem: "cargo", parse: parseCargoToml },
  "pom.xml": { ecosystem: "maven", parse: parsePomXml },
  "pyproject.toml": { ecosystem: "pip", parse: parsePyprojectToml }
};

function isText(content: string): boolean {
  return !content.includes("\u0000");
}

function countNonBlankLines(content: string): number {
  return content.split("\n").filter((line) => line.trim().length > 0).length;
}

function detectLanguage(filePath: string): string | null {
  const name = basename(filePath).toLowerCase();

  if (name === "dockerfile") {
    return "Dockerfile";
  }

  if (name === "makefile") {
    return "Makefile";
  }

  const extension = extname(filePath).toLowerCase();
  return LANGUAGE_BY_EXTENSION[extension] ?? null;
}

async function walkDirectory(
  rootDir: string,
  onFile: (filePath: string) => Promise<void>
): Promise<void> {
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }
      await walkDirectory(entryPath, onFile);
    } else if (entry.isFile()) {
      await onFile(entryPath);
    }
  }
}

export async function analyzeDirectory(
  rootDir: string
): Promise<ScanSummary> {
  const languageMap = new Map<string, { files: number; lines: number }>();
  const dependencies: DependencySummary[] = [];
  let files = 0;
  let linesOfCode = 0;

  await walkDirectory(rootDir, async (filePath) => {
    const content = await readFile(filePath, "utf8").catch(() => null);
    if (content === null || !isText(content)) {
      return;
    }

    files += 1;
    const lines = countNonBlankLines(content);
    linesOfCode += lines;

    const language = detectLanguage(filePath);
    if (language) {
      const current = languageMap.get(language) ?? { files: 0, lines: 0 };
      current.files += 1;
      current.lines += lines;
      languageMap.set(language, current);
    }

    const fileName = basename(filePath);
    const manifestParser = MANIFEST_PARSERS[fileName];
    if (manifestParser) {
      dependencies.push(...manifestParser.parse(content));
    }
  });

  const languages: LanguageSummary[] = [...languageMap.entries()]
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.lines - a.lines);

  dependencies.sort((a, b) => {
    const byEcosystem = a.ecosystem.localeCompare(b.ecosystem);
    return byEcosystem !== 0 ? byEcosystem : a.name.localeCompare(b.name);
  });

  return { files, linesOfCode, languages, dependencies };
}

const MAX_SOURCE_CHARS = 6000;
const MAX_FILE_CHARS = 1500;

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "go.mod",
  "gemfile",
  "composer.json",
  "cargo.toml",
  "pom.xml",
  "pyproject.toml"
]);

function sourceRank(filePath: string): number {
  const name = basename(filePath).toLowerCase();

  if (name.startsWith("readme")) {
    return 0;
  }

  if (MANIFEST_NAMES.has(name)) {
    return 1;
  }

  return 2;
}

export async function collectRepresentativeSource(
  rootDir: string
): Promise<string> {
  const candidates: string[] = [];

  await walkDirectory(rootDir, async (filePath) => {
    const name = basename(filePath).toLowerCase();
    const isReadme = name.startsWith("readme");
    const isManifest = MANIFEST_NAMES.has(name);
    const isSource = detectLanguage(filePath) !== null;

    if (isReadme || isManifest || isSource) {
      candidates.push(filePath);
    }
  });

  candidates.sort(
    (left, right) => sourceRank(left) - sourceRank(right) || left.localeCompare(right)
  );

  const chunks: string[] = [];
  let totalChars = 0;

  for (const filePath of candidates) {
    if (totalChars >= MAX_SOURCE_CHARS) {
      break;
    }

    const content = await readFile(filePath, "utf8").catch(() => null);
    if (content === null || !isText(content)) {
      continue;
    }

    const relativePath = filePath.slice(rootDir.length + 1);
    const combined = `--- ${relativePath} ---\n${content.slice(0, MAX_FILE_CHARS)}`;

    if (totalChars + combined.length > MAX_SOURCE_CHARS) {
      continue;
    }

    chunks.push(combined);
    totalChars += combined.length;
  }

  return chunks.join("\n");
}
