import type {
  CreateRepositoryInput,
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
