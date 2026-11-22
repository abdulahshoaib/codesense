export type RepositoryProvider = "github" | "local";

export interface BranchDTO {
  name: string;
  commitHash: string;
}

export interface RepositoryDTO {
  id: string;
  ownerId: string;
  name: string;
  url: string;
  provider: RepositoryProvider;
  defaultBranch: string;
  description?: string;
  githubFullName?: string;
  createdAt: string;
  updatedAt: string;
}
