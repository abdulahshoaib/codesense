export type RepositoryProvider = "github" | "local";

export interface RepositoryDTO {
  id: string;
  ownerId: string;
  name: string;
  url: string;
  provider: RepositoryProvider;
  defaultBranch: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}
