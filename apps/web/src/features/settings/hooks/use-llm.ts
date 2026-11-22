import type {
  LlmModelsResponse,
  LlmProvider,
  PublicUser,
  UpdateLlmPreferenceInput
} from "@codesense/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";

import { llmService } from "@/features/settings/services/llm.service";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";

function invalidateLlm(queryClient: QueryClient): void {
  queryClient.invalidateQueries({ queryKey: queryKeys.llm.models() });
}

export function useLlmModels(): UseQueryResult<LlmModelsResponse, Error> {
  return useQuery({
    queryKey: queryKeys.llm.models(),
    queryFn: llmService.getModels
  });
}

export function useUpdateLlmPreference(): UseMutationResult<
  PublicUser,
  Error,
  UpdateLlmPreferenceInput
> {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: llmService.updatePreference,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      invalidateLlm(queryClient);
    }
  });
}

export function useSetLlmKey(): UseMutationResult<
  PublicUser,
  Error,
  { provider: LlmProvider; apiKey: string }
> {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: ({ provider, apiKey }) => llmService.setKey(provider, apiKey),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      invalidateLlm(queryClient);
    }
  });
}

export function useDeleteLlmKey(): UseMutationResult<
  PublicUser,
  Error,
  LlmProvider
> {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: llmService.deleteKey,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      invalidateLlm(queryClient);
    }
  });
}
