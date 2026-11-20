import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { analyzeDirectory } from "../../src/services/analysis.service.js";

let rootDir: string;

beforeEach(async () => {
  rootDir = await mkdtemp(join(tmpdir(), "codesense-analysis-test-"));
});

afterEach(async () => {
  await rm(rootDir, { recursive: true, force: true });
});

async function writeFixture(relativePath: string, content: string): Promise<void> {
  const parts = relativePath.split("/");
  const fileName = parts.pop() as string;
  const dirs = parts.join("/");

  if (dirs) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(join(rootDir, dirs), { recursive: true });
  }

  await writeFile(join(rootDir, ...parts, fileName), content, "utf8");
}

describe("analysis service", () => {
  it("detects languages and counts files and lines of code", async () => {
    await writeFixture("app.ts", "export const x = 1;\n");
    await writeFixture("util.py", "print('hello')\n");

    const summary = await analyzeDirectory(rootDir);

    expect(summary.files).toBe(2);
    expect(summary.linesOfCode).toBe(2);

    const typescript = summary.languages.find((l) => l.name === "TypeScript");
    const python = summary.languages.find((l) => l.name === "Python");

    expect(typescript).toMatchObject({ files: 1, lines: 1 });
    expect(python).toMatchObject({ files: 1, lines: 1 });
  });

  it("extracts dependencies from package.json and requirements.txt", async () => {
    await writeFixture(
      "package.json",
      JSON.stringify({
        dependencies: { express: "^5.0.0" },
        devDependencies: { vitest: "5.1.0" }
      })
    );
    await writeFixture("requirements.txt", "requests==2.28.1\nflask\n");

    const summary = await analyzeDirectory(rootDir);

    expect(summary.dependencies).toEqual(
      expect.arrayContaining([
        { ecosystem: "npm", name: "express", version: "^5.0.0" },
        { ecosystem: "npm", name: "vitest", version: "5.1.0" },
        { ecosystem: "pip", name: "requests", version: "2.28.1" },
        { ecosystem: "pip", name: "flask" }
      ])
    );
  });

  it("ignores dependency directories during the walk", async () => {
    await writeFixture("index.js", "const value = 1;\n");
    await writeFixture("node_modules/dep.js", "module.exports = true;\n");

    const summary = await analyzeDirectory(rootDir);

    expect(summary.files).toBe(1);
    expect(summary.linesOfCode).toBe(1);
  });
});
