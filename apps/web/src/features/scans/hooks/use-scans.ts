import type { CreateScanInput, RepositoryDTO, ScanDTO } from "@codesense/shared";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from "@tanstack/react-query";
import { useMemo } from "react";

import { useRepositories } from "@/features/repositories/hooks/use-repositories";
import { scanService } from "@/features/scans/services/scan.service";
import { queryKeys } from "@/lib/query-keys";

export function useRepositoryScans(
  repositoryId: string | undefined
): UseQueryResult<ScanDTO[], Error> {
  return useQuery({
    queryKey: queryKeys.scans.forRepository(repositoryId ?? ""),
    queryFn: () => scanService.listForRepository(repositoryId as string),
    enabled: Boolean(repositoryId)
  });
}

export function useScan(
  id: string | undefined
): UseQueryResult<ScanDTO, Error> {
  return useQuery({
    queryKey: queryKeys.scans.detail(id ?? ""),
    queryFn: () => scanService.get(id as string),
    enabled: Boolean(id)
  });
}

export function useCreateScan(): UseMutationResult<
  ScanDTO,
  Error,
  { repositoryId: string; input: CreateScanInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ repositoryId, input }) =>
      scanService.create(repositoryId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.scans.forRepository(variables.repositoryId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.scans.aggregate()
      });
    }
  });
}

export interface ScanWithRepository {
  scan: ScanDTO;
  repository: RepositoryDTO;
}

export interface AllScansResult {
  repositories: RepositoryDTO[];
  scansWithRepository: ScanWithRepository[];
  scansByRepository: Map<string, ScanDTO[]>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * The backend only exposes scans per repository (`/repositories/:id/scans`),
 * so aggregating across the workspace issues one request per repository.
 * This is acceptable for the initial implementation and should be replaced by
 * a dedicated aggregate endpoint when one exists.
 */
export function useAllScans(): AllScansResult {
  const repositoriesQuery = useRepositories();
  const repositories = useMemo(
    () => repositoriesQuery.data ?? [],
    [repositoriesQuery.data]
  );

  const scanQueries = useQueries({
    queries: repositories.map((repository) => ({
      queryKey: queryKeys.scans.forRepository(repository.id),
      queryFn: () => scanService.listForRepository(repository.id),
      enabled: repositoriesQuery.isSuccess
    }))
  });

  const scansByRepository = useMemo(() => {
    const map = new Map<string, ScanDTO[]>();

    repositories.forEach((repository, index) => {
      map.set(repository.id, scanQueries[index]?.data ?? []);
    });

    return map;
  }, [repositories, scanQueries]);

  const scansWithRepository = useMemo(() => {
    const rows: ScanWithRepository[] = [];

    repositories.forEach((repository) => {
      const scans = scansByRepository.get(repository.id) ?? [];
      scans.forEach((scan) => rows.push({ scan, repository }));
    });

    return rows.sort(
      (a, b) =>
        new Date(b.scan.createdAt).getTime() -
        new Date(a.scan.createdAt).getTime()
    );
  }, [repositories, scansByRepository]);

  const scansError =
    scanQueries
      .map((query) => query.error)
      .find((error): error is Error => Boolean(error)) ?? null;

  return {
    repositories,
    scansWithRepository,
    scansByRepository,
    isLoading:
      repositoriesQuery.isLoading ||
      (repositoriesQuery.isSuccess && scanQueries.some((q) => q.isLoading)),
    isError: repositoriesQuery.isError || scanQueries.some((q) => q.isError),
    error: repositoriesQuery.error ?? scansError,
    refetch: () => {
      void repositoriesQuery.refetch();
      scanQueries.forEach((query) => {
        void query.refetch();
      });
    }
  };
}
