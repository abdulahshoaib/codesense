import type {
  GitHubAuthorizeResponse,
  GithubRepositoryDTO,
  PublicUser,
  UpdateProfileInput
} from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const userService = {
  updateProfile(input: UpdateProfileInput): Promise<PublicUser> {
    return apiClient.patch<PublicUser>("/users/me", input);
  },

  githubAuthorize(): Promise<GitHubAuthorizeResponse> {
    return apiClient.get<GitHubAuthorizeResponse>("/auth/github");
  },

  githubDisconnect(): Promise<PublicUser> {
    return apiClient.delete<PublicUser>("/auth/github");
  },

  githubRepositories(): Promise<GithubRepositoryDTO[]> {
    return apiClient.get<GithubRepositoryDTO[]>("/auth/github/repositories");
  }
};
