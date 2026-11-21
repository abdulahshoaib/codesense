import type { Request, Response } from "express";

import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import {
  completeAuthorization,
  disconnect,
  getAuthorizeUrl,
  listGithubRepositories
} from "./github.service.js";

const authorize = asyncHandler(async (req: Request, res: Response) => {
  const result = getAuthorizeUrl(req.user!.id);
  res.status(200).json(successResponse(result, "GitHub authorization URL"));
});

const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (typeof code !== "string" || typeof state !== "string") {
    res.redirect(
      `${env.WEB_APP_URL}/settings?github=error&reason=INVALID_OAUTH_REQUEST`
    );
    return;
  }

  try {
    await completeAuthorization(code, state);
    res.redirect(`${env.WEB_APP_URL}/settings?github=connected`);
  } catch (error) {
    const reason =
      error instanceof ApiError ? error.code : "GITHUB_CONNECTION_FAILED";
    res.redirect(
      `${env.WEB_APP_URL}/settings?github=error&reason=${encodeURIComponent(reason)}`
    );
  }
});

const disconnectGithub = asyncHandler(async (req: Request, res: Response) => {
  const user = await disconnect(req.user!.id);
  res.status(200).json(successResponse(user, "GitHub account disconnected"));
});

const listRepositories = asyncHandler(async (req: Request, res: Response) => {
  const repositories = await listGithubRepositories(req.user!.id);
  res.status(200).json(successResponse(repositories, "GitHub repositories retrieved"));
});

export const githubController = {
  authorize,
  callback,
  disconnect: disconnectGithub,
  listRepositories
};
