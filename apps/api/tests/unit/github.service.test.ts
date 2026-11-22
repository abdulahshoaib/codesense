import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildGithubCloneUrl,
  githubFullNameFromUrl,
  listGithubBranches
} from "../../src/modules/github/github.service.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("github service", () => {
  it("builds an authenticated clone URL from a repository URL", () => {
    const url = buildGithubCloneUrl(
      "https://github.com/acme/codesense",
      "github_pat_secret"
    );

    expect(url).toBe(
      "https://x-access-token:github_pat_secret@github.com/acme/codesense.git"
    );
  });

  it("normalizes an existing .git suffix", () => {
    const url = buildGithubCloneUrl(
      "https://github.com/acme/codesense.git",
      "token"
    );

    expect(url).toBe("https://x-access-token:token@github.com/acme/codesense.git");
  });

  it("reads owner and repo from a GitHub URL", () => {
    expect(githubFullNameFromUrl("https://github.com/acme/codesense")).toBe(
      "acme/codesense"
    );
    expect(githubFullNameFromUrl("https://github.com/acme/codesense.git")).toBe(
      "acme/codesense"
    );
    expect(githubFullNameFromUrl("not a url")).toBeNull();
  });

  it("lists branches from the GitHub API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { name: "main", commit: { sha: "abc123" } },
        { name: "develop", commit: { sha: "def456" } }
      ])
    });
    vi.stubGlobal("fetch", fetchMock);

    const branches = await listGithubBranches(
      "token",
      "https://github.com/acme/codesense"
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/acme/codesense/branches?per_page=100",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );
    expect(branches).toEqual([
      { name: "main", commitHash: "abc123" },
      { name: "develop", commitHash: "def456" }
    ]);
  });
});
