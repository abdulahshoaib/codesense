import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  inspectProject,
  listFileTree,
  readRepositoryFile,
  searchRepositoryCode
} from "../../src/mcp/content.js";
import { MCP_LIMITS } from "../../src/mcp/limits.js";
import { ApiError } from "../../src/utils/ApiError.js";

const meta = { commitHash: "abc1234", branch: "main" };

describe("mcp content helpers", () => {
  let rootDir = "";

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-content-"));
    await mkdir(join(rootDir, "src"), { recursive: true });
    await mkdir(join(rootDir, "node_modules", "left-pad"), { recursive: true });
    await mkdir(join(rootDir, "dist"), { recursive: true });
    await writeFile(join(rootDir, "src", "index.ts"), "export const n = 1;\n");
    await writeFile(join(rootDir, "src", "util.ts"), "export function add(a: number) {\n  return a + 1;\n}\n");
    await writeFile(
      join(rootDir, "package.json"),
      JSON.stringify({
        name: "demo",
        main: "src/index.ts",
        scripts: { build: "tsc", test: "vitest", lint: "eslint ." },
        dependencies: { react: "19.0.0", express: "5.0.0" }
      })
    );
    await writeFile(join(rootDir, "README.md"), "# Demo\n\nHello world.\n");
    await writeFile(join(rootDir, "pnpm-lock.yaml"), "lockfileVersion: 9.0\n");
    await writeFile(join(rootDir, "node_modules", "left-pad", "index.js"), "module.exports = 1;\n");
    await writeFile(join(rootDir, "dist", "out.js"), "console.log(1);\n");
    await writeFile(join(rootDir, "binary.bin"), Buffer.from([0, 1, 2, 0, 9]));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("lists a bounded tree and skips ignored directories and lockfiles", async () => {
    const tree = await listFileTree(rootDir, meta);

    expect(tree.commitHash).toBe("abc1234");
    expect(tree.entries.some((entry) => entry.path.startsWith("node_modules"))).toBe(
      false
    );
    expect(tree.entries.some((entry) => entry.path.startsWith("dist"))).toBe(false);
    expect(tree.entries.some((entry) => entry.path === "pnpm-lock.yaml")).toBe(
      false
    );
    expect(tree.entries.some((entry) => entry.path === "src/index.ts")).toBe(true);
    expect(tree.limits.maxEntries).toBe(MCP_LIMITS.fileTreeMaxEntries);
  });

  it("reads a text file and rejects path traversal", async () => {
    const file = await readRepositoryFile(rootDir, "src/index.ts", meta);
    expect(file.content).toContain("export const n");
    expect(file.truncated).toBe(false);

    await expect(
      readRepositoryFile(rootDir, "../package.json", meta)
    ).rejects.toMatchObject({ code: "PATH_TRAVERSAL" });
  });

  it("caps oversized file reads", async () => {
    const oversized = "x".repeat(MCP_LIMITS.readFileMaxBytes + 50);
    await writeFile(join(rootDir, "src", "huge.ts"), oversized);

    const file = await readRepositoryFile(rootDir, "src/huge.ts", meta);
    expect(file.truncated).toBe(true);
    expect(file.content.length).toBe(MCP_LIMITS.readFileMaxBytes);
  });

  it("rejects binary files", async () => {
    await expect(
      readRepositoryFile(rootDir, "binary.bin", meta)
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("returns bounded search matches with file, line, and snippet", async () => {
    const result = await searchRepositoryCode(rootDir, "export function add", {
      isRegex: false,
      commitHash: meta.commitHash,
      branch: meta.branch
    });

    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0]?.path).toBe("src/util.ts");
    expect(result.matches[0]?.line).toBe(1);
    expect(result.matches[0]?.snippet).toContain("export function add");
    expect(result.matches.length).toBeLessThanOrEqual(MCP_LIMITS.searchMaxMatches);
  });

  it("detects package manager, scripts, frameworks, and a README excerpt", async () => {
    const info = await inspectProject(rootDir, meta);

    expect(info.packageManager).toBe("pnpm");
    expect(info.scripts.build).toBe("tsc");
    expect(info.frameworks).toEqual(expect.arrayContaining(["React", "Express"]));
    expect(info.entryPoints).toContain("src/index.ts");
    expect(info.readmeExcerpt).toContain("# Demo");
    expect(info.configFiles).toContain("package.json");
  });
});
