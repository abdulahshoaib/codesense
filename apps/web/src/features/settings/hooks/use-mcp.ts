import type {
  CreatedMcpTokenDTO,
  CreateMcpTokenInput,
  McpAccessDTO
} from "@codesense/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";

import { mcpService } from "@/features/settings/services/mcp.service";
import { queryKeys } from "@/lib/query-keys";

export function useMcpAccess(): UseQueryResult<McpAccessDTO, Error> {
  return useQuery({
    queryKey: queryKeys.mcp.access(),
    queryFn: mcpService.getAccess
  });
}

export function useCreateMcpToken(): UseMutationResult<
  CreatedMcpTokenDTO,
  Error,
  CreateMcpTokenInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mcpService.createToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.access() });
    }
  });
}

export function useRevokeMcpToken(): UseMutationResult<null, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: mcpService.revokeToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcp.access() });
    }
  });
}
