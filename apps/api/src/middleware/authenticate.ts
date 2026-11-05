import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/ApiError.js";

const BEARER_PREFIX = "Bearer ";

export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  if (!token) {
    next(ApiError.unauthorized("Authentication required", "AUTH_REQUIRED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (error) {
    next(error);
  }
}
