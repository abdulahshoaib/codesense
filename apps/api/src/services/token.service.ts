import jwt, { type SignOptions } from "jsonwebtoken";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import type { JwtPayload } from "../modules/users/user.types.js";

export function signAccessToken(payload: JwtPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === "string" || !decoded.sub) {
      throw ApiError.unauthorized("Invalid authentication token", "INVALID_TOKEN");
    }

    return {
      sub: String(decoded.sub),
      email: String(decoded.email ?? "")
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.unauthorized(
      "Invalid or expired authentication token",
      "INVALID_TOKEN"
    );
  }
}

const OAUTH_STATE_EXPIRES_IN = "10m";

export function signOAuthState(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: OAUTH_STATE_EXPIRES_IN
  });
}

export function verifyOAuthState(token: string): string {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded === "string" || !decoded.sub) {
      throw ApiError.unauthorized("Invalid OAuth state", "INVALID_OAUTH_STATE");
    }

    return String(decoded.sub);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.unauthorized(
      "Invalid or expired OAuth state",
      "INVALID_OAUTH_STATE"
    );
  }
}
