import type {
  BranchDTO,
  CommitHistoryDTO,
  CreateRepositoryInput,
  ProjectContextDTO,
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

export function useBranches(
  repositoryId: string | undefined
): UseQueryResult<BranchDTO[], Error> {
  return useQuery({
    queryKey: queryKeys.repositories.branches(repositoryId ?? ""),
    queryFn: () => repositoryService.listBranches(repositoryId as string),
    enabled: Boolean(repositoryId)
  });
}

export function useRepositoryInsight(
  id: string | undefined
): UseQueryResult<ProjectContextDTO, Error> {
  return useQuery({
    queryKey: queryKeys.repositories.insight(id ?? ""),
    queryFn: () => repositoryService.getInsight(id as string),
    enabled: Boolean(id)
  });
}

export function useRepositoryCommits(
  id: string | undefined
): UseQueryResult<CommitHistoryDTO[], Error> {
  return useQuery({
    queryKey: queryKeys.repositories.commits(id ?? ""),
    queryFn: () => repositoryService.listCommits(id as string),
    enabled: Boolean(id)
  });
}

export function useRefreshRepositoryInsight(): UseMutationResult<
  ProjectContextDTO,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => repositoryService.refreshInsight(id),
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.repositories.insight(data.repositoryId),
        data
      );
    }
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
