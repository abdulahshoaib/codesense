import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectDependencies,
  dependenciesFromScan
} from "../../src/mcp/dependencies.js";
import { MCP_LIMITS } from "../../src/mcp/limits.js";
import { ApiError } from "../../src/utils/ApiError.js";

const meta = { commitHash: "abc1234", branch: "main" };

describe("mcp dependency collector", () => {
  let rootDir = "";

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-deps-"));
    await mkdir(join(rootDir, "apps", "api"), { recursive: true });
    await mkdir(join(rootDir, "packages", "shared"), { recursive: true });
    await writeFile(
      join(rootDir, "package.json"),
      JSON.stringify({
        name: "demo",
        private: true,
        workspaces: ["apps/*", "packages/*"],
        dependencies: { turbo: "^2.0.0" },
        devDependencies: { typescript: "^5.0.0" }
      })
    );
    await writeFile(
      join(rootDir, "pnpm-workspace.yaml"),
      "packages:\n  - apps/*\n  - packages/*\n"
    );
    await writeFile(
      join(rootDir, "pnpm-lock.yaml"),
      [
        "lockfileVersion: '9.0'",
        "importers:",
        "  .:",
        "    dependencies:",
        "      turbo:",
        "        specifier: ^2.0.0",
        "        version: 2.11.10",
        "    devDependencies:",
        "      typescript:",
        "        specifier: ^5.0.0",
        "        version: 5.9.0",
        "  apps/api:",
        "    dependencies:",
        "      express:",
        "        specifier: ^5.0.0",
        "        version: 5.1.0",
        "      '@codesense/shared':",
        "        specifier: workspace:*",
        "        version: link:../../packages/shared",
        "  packages/shared:",
        "    dependencies:",
        "      zod:",
        "        specifier: ^4.0.0",
        "        version: 4.1.0"
      ].join("\n")
    );
    await writeFile(
      join(rootDir, "apps", "api", "package.json"),
      JSON.stringify({
        name: "@codesense/api",
        dependencies: {
          express: "^5.0.0",
          "@codesense/shared": "workspace:*"
        },
        peerDependencies: { typescript: "^5.0.0" },
        optionalDependencies: { fsevents: "^2.3.0" }
      })
    );
    await writeFile(
      join(rootDir, "packages", "shared", "package.json"),
      JSON.stringify({
        name: "@codesense/shared",
        dependencies: { zod: "^4.0.0" }
      })
    );
    await writeFile(join(rootDir, "requirements.txt"), "flask==3.0.0\n# comment\nrequests>=2.0\n");
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("collects npm and pip manifests with lockfile versions and internal workspaces", async () => {
    const result = await collectDependencies(rootDir, meta);

    expect(result.source).toBe("snapshot");
    expect(result.packageManager).toBe("pnpm");
    expect(result.commitHash).toBe("abc1234");

    const root = result.manifests.find((item) => item.path === "package.json");
    expect(root?.ecosystem).toBe("npm");
    expect(root?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "turbo",
          declared: "^2.0.0",
          resolved: "2.11.10",
          internal: false,
          kind: "dependency"
        })
      ])
    );
    expect(root?.devDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "typescript",
          declared: "^5.0.0",
          resolved: "5.9.0",
          kind: "devDependency"
        })
      ])
    );

    const api = result.manifests.find((item) => item.path === "apps/api/package.json");
    expect(api?.name).toBe("@codesense/api");
    expect(api?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "@codesense/shared",
          declared: "workspace:*",
          internal: true,
          kind: "dependency"
        }),
        expect.objectContaining({
          name: "express",
          declared: "^5.0.0",
          resolved: "5.1.0",
          internal: false
        })
      ])
    );
    expect(api?.peerDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "typescript", kind: "peerDependency" })
      ])
    );
    expect(api?.optionalDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "fsevents", kind: "optionalDependency" })
      ])
    );
    expect(
      api?.dependencies.find((item) => item.name === "@codesense/shared")?.resolved
    ).toBeUndefined();

    const pip = result.manifests.find((item) => item.path === "requirements.txt");
    expect(pip?.ecosystem).toBe("pip");
    expect(pip?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "flask", declared: "==3.0.0" }),
        expect.objectContaining({ name: "requests", declared: ">=2.0" })
      ])
    );

    expect(result.totals.manifests).toBeGreaterThanOrEqual(4);
    expect(result.totals.internal).toBeGreaterThanOrEqual(1);
    expect(result.totals.dependencies).toBeGreaterThanOrEqual(7);
    expect(result.totals.truncated).toBe(false);
  });

  it("filters to one workspace path", async () => {
    const result = await collectDependencies(rootDir, meta, "apps/api");

    expect(result.workspace).toBe("apps/api");
    expect(result.manifests.every((item) => item.path.startsWith("apps/api/"))).toBe(
      true
    );
    expect(result.manifests.some((item) => item.path === "apps/api/package.json")).toBe(
      true
    );
  });

  it("rejects workspace path traversal", async () => {
    await expect(
      collectDependencies(rootDir, meta, "../secret")
    ).rejects.toMatchObject({ code: "PATH_TRAVERSAL" });
    await expect(collectDependencies(rootDir, meta, "../secret")).rejects.toBeInstanceOf(
      ApiError
    );
  });

  it("parses go.mod and Cargo.toml when present", async () => {
    await writeFile(
      join(rootDir, "go.mod"),
      "module example.com/demo\n\nrequire (\n\tgithub.com/foo/bar v1.2.3 // indirect\n)\n"
    );
    await writeFile(
      join(rootDir, "Cargo.toml"),
      '[package]\nname = "demo"\n\n[dependencies]\nserde = "1.0"\n\n[dev-dependencies]\ntokio = { version = "1.40", features = ["full"] }\n'
    );

    const result = await collectDependencies(rootDir, meta);
    const go = result.manifests.find((item) => item.path === "go.mod");
    expect(go?.ecosystem).toBe("go");
    expect(go?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "github.com/foo/bar", declared: "v1.2.3" })
      ])
    );

    const cargo = result.manifests.find((item) => item.path === "Cargo.toml");
    expect(cargo?.ecosystem).toBe("cargo");
    expect(cargo?.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "serde", declared: "1.0" })
      ])
    );
    expect(cargo?.devDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "tokio", declared: "1.40", kind: "devDependency" })
      ])
    );
  });

  it("reads resolved versions from package-lock.json when pnpm-lock is absent", async () => {
    await rm(join(rootDir, "pnpm-lock.yaml"));
    await rm(join(rootDir, "pnpm-workspace.yaml"));
    await writeFile(
      join(rootDir, "package-lock.json"),
      JSON.stringify({
        packages: {
          "": { name: "demo" },
          "node_modules/turbo": { version: "2.5.0" }
        }
      })
    );

    const result = await collectDependencies(rootDir, meta);
    expect(result.packageManager).toBe("npm");
    const root = result.manifests.find((item) => item.path === "package.json");
    expect(root?.dependencies[0]).toEqual(
      expect.objectContaining({ name: "turbo", resolved: "2.5.0" })
    );
  });

  it("formats stored scan dependencies when a scan is used", () => {
    const result = dependenciesFromScan(
      [
        { ecosystem: "npm", name: "react", version: "19.0.0" },
        { ecosystem: "npm", name: "express" }
      ],
      meta
    );

    expect(result.source).toBe("scan");
    expect(result.packageManager).toBe("npm");
    expect(result.manifests).toHaveLength(1);
    expect(result.manifests[0]?.path).toBe("(scan)");
    expect(result.manifests[0]?.dependencies).toEqual([
      expect.objectContaining({
        name: "react",
        declared: "19.0.0",
        resolved: "19.0.0"
      }),
      expect.objectContaining({ name: "express", declared: null })
    ]);
    expect(result.totals.dependencies).toBe(2);
  });

  it("caps scan dependency lists", () => {
    const result = dependenciesFromScan(
      Array.from({ length: MCP_LIMITS.dependenciesMax + 5 }, (_, index) => ({
        ecosystem: "npm",
        name: `pkg-${index}`
      })),
      meta
    );

    expect(result.manifests[0]?.dependencies).toHaveLength(MCP_LIMITS.dependenciesMax);
    expect(result.totals.truncated).toBe(true);
  });
});
