import { describe, expect, it } from "vitest";

import { safeHref } from "@/lib/safe-href";

describe("safeHref", () => {
  it("returns https URLs unchanged", () => {
    expect(safeHref("https://github.com/acme/codesense")).toBe(
      "https://github.com/acme/codesense"
    );
  });

  it("rejects non-https protocols and invalid URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref("http://example.com")).toBeUndefined();
    expect(safeHref("file:///etc/passwd")).toBeUndefined();
    expect(safeHref("not a url")).toBeUndefined();
  });
});
