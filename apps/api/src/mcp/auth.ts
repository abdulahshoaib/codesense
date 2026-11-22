import type { NextFunction, Request, Response } from "express";

import { mcpTokenService } from "../modules/mcp-tokens/mcp-token.service.js";
import { ApiError } from "../utils/ApiError.js";

const BEARER_PREFIX = "Bearer ";

export async function authenticateMcp(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(ApiError.unauthorized("MCP token required", "MCP_AUTH_REQUIRED"));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  if (!token) {
    next(ApiError.unauthorized("MCP token required", "MCP_AUTH_REQUIRED"));
    return;
  }

  try {
    const session = await mcpTokenService.authenticate(token);

    if (!session) {
      next(
        ApiError.unauthorized("Invalid or revoked MCP token", "MCP_TOKEN_INVALID")
      );
      return;
    }

    req.user = { id: session.userId, email: session.email };
    next();
  } catch (error) {
    next(error);
  }
}
