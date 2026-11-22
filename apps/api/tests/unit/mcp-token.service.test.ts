import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  findById: vi.fn(),
  findOneAndDelete: vi.fn(),
  create: vi.fn(),
  countDocuments: vi.fn()
}));

vi.mock("../../src/modules/mcp-tokens/mcp-token.model.js", () => ({
  McpToken: {
    find: mocks.find,
    findOne: mocks.findOne,
    findOneAndDelete: mocks.findOneAndDelete,
    create: mocks.create,
    countDocuments: mocks.countDocuments
  }
}));

vi.mock("../../src/modules/users/user.model.js", () => ({
  User: {
    findById: mocks.findById
  }
}));

const {
  generateMcpToken,
  hashMcpToken,
  mcpTokenService
} = await import("../../src/modules/mcp-tokens/mcp-token.service.js");

const userId = "507f1f77bcf86cd799439011";
const tokenId = "507f1f77bcf86cd799439099";

function buildTokenDocument(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => tokenId },
    userId: { toString: () => userId },
    name: "laptop",
    tokenHash: "abc",
    prefix: "cs_abcdefgh",
    lastUsedAt: null,
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    updatedAt: new Date("2026-11-01T00:00:00.000Z"),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
}

describe("mcp token hashing", () => {
  it("generates a cs_ token and a short display prefix", () => {
    const generated = generateMcpToken();

    expect(generated.token.startsWith("cs_")).toBe(true);
    expect(generated.prefix).toBe(generated.token.slice(0, 12));
    expect(generated.prefix).not.toBe(generated.token);
  });

  it("hashes tokens with sha256 hex", () => {
    const hash = hashMcpToken("cs_example");

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashMcpToken("cs_example"));
    expect(hash).not.toBe(hashMcpToken("cs_other"));
  });
});

describe("mcpTokenService", () => {
  it("returns the plaintext token only when creating", async () => {
    mocks.countDocuments.mockReturnValue({
      exec: vi.fn().mockResolvedValue(0)
    });
    mocks.create.mockImplementation(async (data: Record<string, unknown>) =>
      buildTokenDocument({
        name: data.name,
        tokenHash: data.tokenHash,
        prefix: data.prefix
      })
    );

    const created = await mcpTokenService.createToken(userId, { name: "laptop" });

    expect(created.token.startsWith("cs_")).toBe(true);
    expect(created.prefix).toBe(created.token.slice(0, 12));
    expect(mocks.create.mock.calls[0]?.[0]).toMatchObject({
      name: "laptop",
      tokenHash: hashMcpToken(created.token)
    });
    expect(JSON.stringify(mocks.create.mock.calls[0]?.[0])).not.toContain(
      created.token
    );
  });

  it("rejects a 21st token for the same user", async () => {
    mocks.countDocuments.mockReturnValue({
      exec: vi.fn().mockResolvedValue(20)
    });

    await expect(
      mcpTokenService.createToken(userId, { name: "extra" })
    ).rejects.toMatchObject({
      statusCode: 400,
      code: "MCP_TOKEN_LIMIT"
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("scopes revoke to the owning user", async () => {
    mocks.findOneAndDelete.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null)
    });

    await expect(
      mcpTokenService.revokeToken(userId, tokenId)
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "MCP_TOKEN_NOT_FOUND"
    });
  });

  it("authenticates a valid token and records lastUsedAt", async () => {
    const document = buildTokenDocument();
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(document)
      })
    });
    mocks.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({
        _id: { toString: () => userId },
        email: "ada@example.com"
      })
    });

    const session = await mcpTokenService.authenticate("cs_validtoken");

    expect(session).toEqual({
      id: tokenId,
      userId,
      email: "ada@example.com",
      name: "laptop"
    });
    expect(document.lastUsedAt).toBeInstanceOf(Date);
    expect(document.save).toHaveBeenCalledOnce();
  });

  it("returns null for a missing or revoked token", async () => {
    mocks.findOne.mockReturnValue({
      select: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(null)
      })
    });

    await expect(mcpTokenService.authenticate("cs_unknown")).resolves.toBeNull();
  });

  it("returns null for a non-mcp token", async () => {
    await expect(mcpTokenService.authenticate("not-an-mcp-token")).resolves.toBeNull();
    expect(mocks.findOne).not.toHaveBeenCalled();
  });
});
