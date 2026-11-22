import type { CreateMcpTokenInput } from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { mcpTokenService } from "./mcp-token.service.js";

const getAccess = asyncHandler(async (req: Request, res: Response) => {
  const access = await mcpTokenService.getAccess(req.user!.id);
  res.status(200).json(successResponse(access, "MCP access retrieved"));
});

const create = asyncHandler(async (req: Request, res: Response) => {
  const token = await mcpTokenService.createToken(
    req.user!.id,
    req.body as CreateMcpTokenInput
  );
  res.status(201).json(successResponse(token, "MCP token created"));
});

const revoke = asyncHandler(async (req: Request, res: Response) => {
  await mcpTokenService.revokeToken(req.user!.id, req.params.id as string);
  res.status(200).json(successResponse(null, "MCP token revoked"));
});

export const mcpTokenController = {
  getAccess,
  create,
  revoke
};
