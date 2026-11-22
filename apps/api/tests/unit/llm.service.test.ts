import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserDocument } from "../../src/modules/users/user.types.js";
import {
  AuthError,
  RateLimitError
} from "../../src/services/llm/errors.js";

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  summarizeCodebase: vi.fn(),
  decryptSecret: vi.fn()
}));

vi.mock("../../src/modules/users/user.model.js", () => ({
  User: { findById: mocks.findById }
}));

vi.mock("../../src/services/ai.service.js", () => ({
  summarizeCodebase: mocks.summarizeCodebase
}));

vi.mock("../../src/services/encryption.service.js", () => ({
  decryptSecret: mocks.decryptSecret
}));

const { resolveSelection, summarizeCodebaseForScan } = await import(
  "../../src/modules/llm/llm.service.js"
);

function makeUser(overrides: Record<string, unknown> = {}): UserDocument {
  return {
    _id: { toString: () => "507f1f77bcf86cd799439011" } as UserDocument["_id"],
    name: "Ada Lovelace",
    email: "ada@example.com",
    passwordHash: "hash",
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    updatedAt: new Date("2026-11-01T00:00:00.000Z"),
    llmKeys: undefined,
    llmPreference: undefined,
    ...overrides
  } as UserDocument;
}

const codebaseInput = {
  repositoryName: "codesense",
  branch: "main",
  files: 10,
  linesOfCode: 500,
  languages: [],
  dependencies: []
};

describe("resolveSelection", () => {
  it("prefers the scan override when its provider is available", () => {
    const user = makeUser({
      llmKeys: { groq: "encrypted" },
      llmPreference: {
        provider: "openrouter",
        modelId: "openai/gpt-oss-120b:free",
        fallbackEnabled: false
      }
    });

    const selection = resolveSelection(user, {
      provider: "groq",
      modelId: "openai/gpt-oss-20b"
    });

    expect(selection).toEqual({
      provider: "groq",
      modelId: "openai/gpt-oss-20b",
      fallbackEnabled: false
    });
  });

  it("falls back to the user preference when there is no override", () => {
    const user = makeUser({
      llmKeys: { openrouter: "encrypted" },
      llmPreference: {
        provider: "openrouter",
        modelId: "openai/gpt-oss-120b:free",
        fallbackEnabled: true
      }
    });

    expect(resolveSelection(user)).toEqual({
      provider: "openrouter",
      modelId: "openai/gpt-oss-120b:free",
      fallbackEnabled: true
    });
  });

  it("falls back to the registry default when nothing is set", () => {
    const user = makeUser({ llmKeys: { groq: "encrypted" } });

    const selection = resolveSelection(user);

    expect(selection?.provider).toBe("groq");
    expect(selection?.modelId).toBe("openai/gpt-oss-120b");
    expect(selection?.fallbackEnabled).toBe(false);
  });

  it("returns null when no provider has a key", () => {
    expect(resolveSelection(makeUser())).toBeNull();
  });
});

describe("summarizeCodebaseForScan", () => {
  beforeEach(() => {
    mocks.findById.mockReset();
    mocks.summarizeCodebase.mockReset();
    mocks.decryptSecret.mockReset();
    mocks.decryptSecret.mockReturnValue("user-key");
  });

  it("returns the primary summary without fallback", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        exec: async () =>
          makeUser({
            llmKeys: { groq: "encrypted" },
            llmPreference: {
              provider: "groq",
              modelId: "openai/gpt-oss-120b",
              fallbackEnabled: false
            }
          })
      })
    });
    mocks.summarizeCodebase.mockResolvedValue("primary summary");

    const result = await summarizeCodebaseForScan(
      "507f1f77bcf86cd799439011",
      undefined,
      codebaseInput
    );

    expect(result).toEqual({
      aiSummary: "primary summary",
      provider: "groq",
      modelId: "openai/gpt-oss-120b",
      fallbackUsed: false
    });
    expect(mocks.summarizeCodebase).toHaveBeenCalledTimes(1);
  });

  it("retries once on the fallback provider when rate limited", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        exec: async () =>
          makeUser({
            llmKeys: { groq: "encrypted", openrouter: "encrypted" },
            llmPreference: {
              provider: "groq",
              modelId: "openai/gpt-oss-120b",
              fallbackEnabled: true
            }
          })
      })
    });
    mocks.summarizeCodebase
      .mockRejectedValueOnce(new RateLimitError("rate limited", 720))
      .mockResolvedValueOnce("fallback summary");

    const result = await summarizeCodebaseForScan(
      "507f1f77bcf86cd799439011",
      undefined,
      codebaseInput
    );

    expect(result).toEqual({
      aiSummary: "fallback summary",
      provider: "openrouter",
      modelId: "openai/gpt-oss-120b:free",
      fallbackUsed: true
    });
    expect(mocks.summarizeCodebase).toHaveBeenCalledTimes(2);
  });

  it("sets a friendly error instead of falling back when disabled", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        exec: async () =>
          makeUser({
            llmKeys: { groq: "encrypted" },
            llmPreference: {
              provider: "groq",
              modelId: "openai/gpt-oss-120b",
              fallbackEnabled: false
            }
          })
      })
    });
    mocks.summarizeCodebase.mockRejectedValueOnce(
      new RateLimitError("rate limited", 720)
    );

    const result = await summarizeCodebaseForScan(
      "507f1f77bcf86cd799439011",
      undefined,
      codebaseInput
    );

    expect(result?.aiSummary).toBeNull();
    expect(result?.fallbackUsed).toBe(false);
    expect(result?.aiError).toContain("Groq free-tier limit reached");
    expect(result?.aiError).toContain("openai/gpt-oss-120b");
    expect(mocks.summarizeCodebase).toHaveBeenCalledTimes(1);
  });

  it("sets an auth error message on AuthError", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        exec: async () =>
          makeUser({
            llmKeys: { groq: "encrypted" },
            llmPreference: {
              provider: "groq",
              modelId: "openai/gpt-oss-120b",
              fallbackEnabled: false
            }
          })
      })
    });
    mocks.summarizeCodebase.mockRejectedValueOnce(
      new AuthError("bad key")
    );

    const result = await summarizeCodebaseForScan(
      "507f1f77bcf86cd799439011",
      undefined,
      codebaseInput
    );

    expect(result?.aiError).toBe("Invalid or missing API key for Groq");
  });

  it("returns null when the resolved provider has no usable key", async () => {
    mocks.findById.mockReturnValue({
      select: () => ({
        exec: async () => makeUser()
      })
    });

    const result = await summarizeCodebaseForScan(
      "507f1f77bcf86cd799439011",
      undefined,
      codebaseInput
    );

    expect(result).toBeNull();
  });
});
