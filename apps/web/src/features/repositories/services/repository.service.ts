import type {
  BranchDTO,
  CommitHistoryDTO,
  CreateRepositoryInput,
  ProjectContextDTO,
  RepositoryDTO,
  UpdateRepositoryInput
} from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const repositoryService = {
  list(): Promise<RepositoryDTO[]> {
    return apiClient.get<RepositoryDTO[]>("/repositories");
  },

  get(id: string): Promise<RepositoryDTO> {
    return apiClient.get<RepositoryDTO>(`/repositories/${id}`);
  },

  listBranches(id: string): Promise<BranchDTO[]> {
    return apiClient.get<BranchDTO[]>(`/repositories/${id}/branches`);
  },

  getInsight(id: string): Promise<ProjectContextDTO> {
    return apiClient.get<ProjectContextDTO>(`/repositories/${id}/insight`);
  },

  listCommits(id: string): Promise<CommitHistoryDTO[]> {
    return apiClient.get<CommitHistoryDTO[]>(`/repositories/${id}/commits`);
  },

  refreshInsight(id: string): Promise<ProjectContextDTO> {
    return apiClient.post<ProjectContextDTO>(`/repositories/${id}/insight/refresh`);
  },

  create(input: CreateRepositoryInput): Promise<RepositoryDTO> {
    return apiClient.post<RepositoryDTO>("/repositories", input);
  },

  update(id: string, input: UpdateRepositoryInput): Promise<RepositoryDTO> {
    return apiClient.patch<RepositoryDTO>(`/repositories/${id}`, input);
  },

  remove(id: string): Promise<null> {
    return apiClient.delete<null>(`/repositories/${id}`);
  }
};
