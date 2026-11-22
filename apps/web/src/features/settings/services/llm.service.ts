import type {
  LlmModelsResponse,
  LlmProvider,
  PublicUser,
  UpdateLlmPreferenceInput
} from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const llmService = {
  getModels(): Promise<LlmModelsResponse> {
    return apiClient.get<LlmModelsResponse>("/llm/models");
  },

  updatePreference(input: UpdateLlmPreferenceInput): Promise<PublicUser> {
    return apiClient.patch<PublicUser>("/users/me/llm", input);
  },

  setKey(provider: LlmProvider, apiKey: string): Promise<PublicUser> {
    return apiClient.put<PublicUser>(`/users/me/llm/keys/${provider}`, {
      apiKey
    });
  },

  deleteKey(provider: LlmProvider): Promise<PublicUser> {
    return apiClient.delete<PublicUser>(`/users/me/llm/keys/${provider}`);
  }
};
