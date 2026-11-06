import type { RepositoryDTO, RepositoryProvider } from "@codesense/shared";
import type { Types } from "mongoose";

export interface RepositoryDocument {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  url: string;
  provider: RepositoryProvider;
  defaultBranch: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRepositoryData {
  name: string;
  url: string;
  provider: RepositoryProvider;
  defaultBranch: string;
  description?: string;
}

export function toRepositoryDTO(repository: RepositoryDocument): RepositoryDTO {
  return {
    id: repository._id.toString(),
    ownerId: repository.ownerId.toString(),
    name: repository.name,
    url: repository.url,
    provider: repository.provider,
    defaultBranch: repository.defaultBranch,
    ...(repository.description !== undefined
      ? { description: repository.description }
      : {}),
    createdAt: repository.createdAt.toISOString(),
    updatedAt: repository.updatedAt.toISOString()
  };
}
