import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn()
}));

vi.mock("../../src/modules/mcp-tokens/mcp-token.service.js", () => ({
  mcpTokenService: {
    authenticate: mocks.authenticate
  }
}));

const { authenticateMcp } = await import("../../src/mcp/auth.js");
const { ApiError } = await import("../../src/utils/ApiError.js");

function createRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {}
  } as Request;
}

function createNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe("authenticateMcp", () => {
  it("rejects a missing bearer token", async () => {
    const next = createNext();
    await authenticateMcp(createRequest(), {} as Response, next);

    const error = vi.mocked(next).mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "MCP_AUTH_REQUIRED", statusCode: 401 });
  });

  it("rejects a revoked or unknown token", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const next = createNext();
    await authenticateMcp(
      createRequest("Bearer cs_revoked"),
      {} as Response,
      next
    );

    const error = vi.mocked(next).mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: "MCP_TOKEN_INVALID", statusCode: 401 });
  });

  it("scopes the request to the token owner", async () => {
    mocks.authenticate.mockResolvedValue({
      id: "token-1",
      userId: "507f1f77bcf86cd799439011",
      email: "ada@example.com",
      name: "laptop"
    });
    const req = createRequest("Bearer cs_valid");
    const next = createNext();

    await authenticateMcp(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: "507f1f77bcf86cd799439011",
      email: "ada@example.com"
    });
  });
});
