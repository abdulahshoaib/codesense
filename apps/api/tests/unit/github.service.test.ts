import { describe, expect, it } from "vitest";

import { buildGithubCloneUrl } from "../../src/modules/github/github.service.js";

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
});
