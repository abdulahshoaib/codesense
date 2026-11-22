import type {
  LlmProvider,
  SetLlmKeyInput,
  UpdateLlmPreferenceInput
} from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { llmService } from "./llm.service.js";

const getModels = asyncHandler(async (req: Request, res: Response) => {
  const result = await llmService.getModels(req.user!.id);
  res.status(200).json(successResponse(result, "LLM models retrieved"));
});

const updatePreference = asyncHandler(async (req: Request, res: Response) => {
  const user = await llmService.updatePreference(
    req.user!.id,
    req.body as UpdateLlmPreferenceInput
  );
  res.status(200).json(successResponse(user, "LLM preference updated"));
});

const setKey = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SetLlmKeyInput;
  const user = await llmService.setKey(
    req.user!.id,
    req.params.provider as LlmProvider,
    body.apiKey
  );
  res.status(200).json(successResponse(user, "LLM API key saved"));
});

const deleteKey = asyncHandler(async (req: Request, res: Response) => {
  const user = await llmService.deleteKey(
    req.user!.id,
    req.params.provider as LlmProvider
  );
  res.status(200).json(successResponse(user, "LLM API key removed"));
});

export const llmController = {
  getModels,
  updatePreference,
  setKey,
  deleteKey
};
