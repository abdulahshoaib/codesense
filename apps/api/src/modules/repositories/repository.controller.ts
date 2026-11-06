import type {
  CreateRepositoryInput,
  UpdateRepositoryInput
} from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { repositoryService } from "./repository.service.js";

const create = asyncHandler(async (req: Request, res: Response) => {
  const repository = await repositoryService.createRepository(
    req.user!.id,
    req.body as CreateRepositoryInput
  );
  res.status(201).json(successResponse(repository, "Repository created"));
});

const list = asyncHandler(async (req: Request, res: Response) => {
  const repositories = await repositoryService.listRepositories(req.user!.id);
  res
    .status(200)
    .json(successResponse(repositories, "Repositories retrieved"));
});

const getOne = asyncHandler(async (req: Request, res: Response) => {
  const repository = await repositoryService.getRepository(
    req.user!.id,
    req.params.id as string
  );
  res.status(200).json(successResponse(repository, "Repository retrieved"));
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const repository = await repositoryService.updateRepository(
    req.user!.id,
    req.params.id as string,
    req.body as UpdateRepositoryInput
  );
  res.status(200).json(successResponse(repository, "Repository updated"));
});

const remove = asyncHandler(async (req: Request, res: Response) => {
  await repositoryService.deleteRepository(
    req.user!.id,
    req.params.id as string
  );
  res.status(200).json(successResponse(null, "Repository deleted"));
});

export const repositoryController = {
  create,
  list,
  getOne,
  update,
  remove
};
