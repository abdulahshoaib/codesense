import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { authenticate } from "../../src/middleware/authenticate.js";
import { signAccessToken } from "../../src/services/token.service.js";
import { ApiError } from "../../src/utils/ApiError.js";

function createRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {}
  } as Request;
}

function createNext(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe("authenticate middleware", () => {
  it("rejects requests without an authorization header", () => {
    const next = createNext();

    authenticate(createRequest(), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("AUTH_REQUIRED");
  });

  it("rejects malformed tokens", () => {
    const next = createNext();

    authenticate(createRequest("Bearer not-a-real-token"), {} as Response, next);

    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("INVALID_TOKEN");
  });

  it("attaches the authenticated user and continues for valid tokens", () => {
    const payload = {
      sub: "507f1f77bcf86cd799439011",
      email: "ada@example.com"
    };
    const token = signAccessToken(payload);
    const req = createRequest(`Bearer ${token}`);
    const next = createNext();

    authenticate(req, {} as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: payload.sub,
      email: payload.email
    });
  });
});
