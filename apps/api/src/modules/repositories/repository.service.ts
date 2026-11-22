import type {
  BranchDTO,
  RepositoryDTO,
  UpdateRepositoryInput
} from "@codesense/shared";
import { Types } from "mongoose";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { listRemoteBranches } from "../../services/git.service.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  createGithubWebhook,
  deleteGithubWebhook,
  getGithubAccessToken,
  githubFullNameFromUrl,
  listGithubBranches
} from "../github/github.service.js";
import { ProjectContext } from "./repository-insight.model.js";
import { Repository } from "./repository.model.js";
import {
  toRepositoryDTO,
  type CreateRepositoryData,
  type RepositoryDocument
} from "./repository.types.js";

const NOT_FOUND = () =>
  ApiError.notFound("Repository not found", "REPOSITORY_NOT_FOUND");

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

function resolveGithubFullName(
  provider: CreateRepositoryData["provider"],
  url: string,
  githubFullName?: string
): string | undefined {
  if (provider !== "github") {
    return undefined;
  }

  return githubFullName?.trim() || githubFullNameFromUrl(url) || undefined;
}

async function createRepository(
  ownerId: string,
  data: CreateRepositoryData
): Promise<RepositoryDTO> {
  const githubFullName = resolveGithubFullName(
    data.provider,
    data.url,
    data.githubFullName
  );
  const repository = await Repository.create({
    ...data,
    ...(githubFullName ? { githubFullName } : {}),
    ownerId: toObjectId(ownerId)
  });

  if (
    repository.provider === "github" &&
    env.WEBHOOK_BASE_URL &&
    env.GITHUB_WEBHOOK_SECRET
  ) {
    try {
      const accessToken = await getGithubAccessToken(ownerId);
      const hook = await createGithubWebhook(
        accessToken,
        repository.url,
        `${env.WEBHOOK_BASE_URL}/api/v1/github/webhook`,
        env.GITHUB_WEBHOOK_SECRET
      );

      repository.githubWebhookId = hook.id;
      await repository.save();
    } catch (error) {
      logger.warn({ error, repositoryId: repository._id.toString() }, "Failed to register GitHub webhook");
    }
  }

  return toRepositoryDTO(repository);
}

async function listRepositories(ownerId: string): Promise<RepositoryDTO[]> {
  const repositories = await Repository.find({ ownerId: toObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .exec();

  return repositories.map(toRepositoryDTO);
}

async function getOwnedRepository(
  ownerId: string,
  repositoryId: string
): Promise<RepositoryDocument> {
  const repository = await Repository.findOne({
    _id: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId)
  }).exec();

  if (!repository) {
    throw NOT_FOUND();
  }

  return repository;
}

async function getRepository(
  ownerId: string,
  repositoryId: string
): Promise<RepositoryDTO> {
  return toRepositoryDTO(await getOwnedRepository(ownerId, repositoryId));
}

// shortcut: URL edits keep the existing webhook, recreate the repository to point it at a new remote
async function updateRepository(
  ownerId: string,
  repositoryId: string,
  data: UpdateRepositoryInput
): Promise<RepositoryDTO> {
  const existing = await getOwnedRepository(ownerId, repositoryId);
  const githubFullName = resolveGithubFullName(
    data.provider ?? existing.provider,
    data.url ?? existing.url,
    data.githubFullName
  );
  const repository = await Repository.findOneAndUpdate(
    { _id: existing._id, ownerId: existing.ownerId },
    {
      $set: {
        ...data,
        ...(githubFullName ? { githubFullName } : {})
      }
    },
    { new: true, runValidators: true }
  ).exec();

  if (!repository) {
    throw NOT_FOUND();
  }

  return toRepositoryDTO(repository);
}

async function deleteRepository(
  ownerId: string,
  repositoryId: string
): Promise<void> {
  const repository = await Repository.findOne({
    _id: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId)
  }).exec();

  if (!repository) {
    throw NOT_FOUND();
  }

  if (repository.provider === "github" && repository.githubWebhookId) {
    try {
      const accessToken = await getGithubAccessToken(ownerId);
      await deleteGithubWebhook(
        accessToken,
        repository.url,
        repository.githubWebhookId
      );
    } catch (error) {
      logger.warn({ error, repositoryId }, "Failed to delete GitHub webhook");
    }
  }

  await ProjectContext.deleteOne({ repositoryId: repository._id }).exec();
  await Repository.findByIdAndDelete(repository._id).exec();
}

async function listBranches(
  ownerId: string,
  repositoryId: string
): Promise<BranchDTO[]> {
  const repository = await getOwnedRepository(ownerId, repositoryId);

  if (repository.provider === "github") {
    const accessToken = await getGithubAccessToken(ownerId);
    return listGithubBranches(accessToken, repository.url);
  }

  return listRemoteBranches(repository.url);
}

export const repositoryService = {
  createRepository,
  listRepositories,
  getOwnedRepository,
  getRepository,
  updateRepository,
  deleteRepository,
  listBranches
};
