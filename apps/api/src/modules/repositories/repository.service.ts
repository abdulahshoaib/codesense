import type {
  RepositoryDTO,
  UpdateRepositoryInput
} from "@codesense/shared";
import { Types } from "mongoose";

import { ApiError } from "../../utils/ApiError.js";
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

async function createRepository(
  ownerId: string,
  data: CreateRepositoryData
): Promise<RepositoryDTO> {
  const repository = await Repository.create({
    ...data,
    ownerId: toObjectId(ownerId)
  });

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

async function updateRepository(
  ownerId: string,
  repositoryId: string,
  data: UpdateRepositoryInput
): Promise<RepositoryDTO> {
  const repository = await Repository.findOneAndUpdate(
    { _id: toObjectId(repositoryId), ownerId: toObjectId(ownerId) },
    { $set: data },
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
  const repository = await Repository.findOneAndDelete({
    _id: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId)
  }).exec();

  if (!repository) {
    throw NOT_FOUND();
  }
}

export const repositoryService = {
  createRepository,
  listRepositories,
  getOwnedRepository,
  getRepository,
  updateRepository,
  deleteRepository
};
