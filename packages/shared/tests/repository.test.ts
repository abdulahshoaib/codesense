import { describe, expect, it } from "vitest";

import { repositoryUrlSchema } from "../src/schemas/repository.js";

describe("repositoryUrlSchema", () => {
  it("accepts GitHub HTTPS repository URLs", () => {
    expect(
      repositoryUrlSchema.parse("https://github.com/acme/codesense")
    ).toBe("https://github.com/acme/codesense");
    expect(
      repositoryUrlSchema.parse("https://github.com/acme/codesense.git")
    ).toBe("https://github.com/acme/codesense.git");
    expect(
      repositoryUrlSchema.parse("https://github.com/acme/codesense/")
    ).toBe("https://github.com/acme/codesense/");
  });

  it("rejects javascript, file, and non-GitHub URLs", () => {
    expect(repositoryUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false
    );
    expect(repositoryUrlSchema.safeParse("file:///etc/passwd").success).toBe(
      false
    );
    expect(
      repositoryUrlSchema.safeParse("https://evil.example/acme/codesense")
        .success
    ).toBe(false);
    expect(
      repositoryUrlSchema.safeParse("http://github.com/acme/codesense").success
    ).toBe(false);
    expect(
      repositoryUrlSchema.safeParse("https://192.168.1.10/acme/codesense")
        .success
    ).toBe(false);
  });
});
