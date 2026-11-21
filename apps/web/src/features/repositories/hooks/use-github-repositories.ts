import type { GithubRepositoryDTO } from "@codesense/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { userService } from "@/features/settings/services/user.service";
import { queryKeys } from "@/lib/query-keys";

export function useGithubRepositories(): UseQueryResult<
  GithubRepositoryDTO[],
  Error
> {
  return useQuery({
    queryKey: queryKeys.github.repositories(),
    queryFn: userService.githubRepositories
  });
}
