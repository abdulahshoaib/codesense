import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveSafePath } from "../../src/mcp/paths.js";
import { ApiError } from "../../src/utils/ApiError.js";

describe("resolveSafePath", () => {
  let rootDir = "";

  afterEach(async () => {
    if (rootDir) {
      await rm(rootDir, { recursive: true, force: true });
      rootDir = "";
    }
  });

  it("resolves a nested file inside the root", async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-path-"));
    const resolved = resolveSafePath(rootDir, "src/index.ts");
    expect(resolved).toBe(join(rootDir, "src/index.ts"));
  });

  it("rejects parent-directory traversal", async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-path-"));

    expect(() => resolveSafePath(rootDir, "../secret")).toThrow(ApiError);
    expect(() => resolveSafePath(rootDir, "src/../../etc/passwd")).toThrow(
      /Path traversal/
    );
  });

  it("rejects absolute paths", async () => {
    rootDir = await mkdtemp(join(tmpdir(), "codesense-path-"));
    expect(() => resolveSafePath(rootDir, "/etc/passwd")).toThrow(ApiError);
  });
});
