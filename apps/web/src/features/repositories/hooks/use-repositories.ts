import type {
  CreateRepositoryInput,
  UpdateRepositoryInput
} from "@codesense/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import type { RepositoryDTO } from "@codesense/shared";

import { repositoryService } from "@/features/repositories/services/repository.service";
import { queryKeys } from "@/lib/query-keys";

export function useRepositories(): UseQueryResult<RepositoryDTO[], Error> {
  return useQuery({
    queryKey: queryKeys.repositories.list(),
    queryFn: repositoryService.list
  });
}

export function useRepository(
  id: string | undefined
): UseQueryResult<RepositoryDTO, Error> {
  return useQuery({
    queryKey: queryKeys.repositories.detail(id ?? ""),
    queryFn: () => repositoryService.get(id as string),
    enabled: Boolean(id)
  });
}

export function useCreateRepository(): UseMutationResult<
  RepositoryDTO,
  Error,
  CreateRepositoryInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: repositoryService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.repositories.all()
      });
    }
  });
}

export function useUpdateRepository(): UseMutationResult<
  RepositoryDTO,
  Error,
  { id: string; input: UpdateRepositoryInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => repositoryService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.repositories.all()
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.repositories.detail(data.id)
      });
    }
  });
}

export function useDeleteRepository(): UseMutationResult<
  null,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => repositoryService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.repositories.all()
      });
    }
  });
}
