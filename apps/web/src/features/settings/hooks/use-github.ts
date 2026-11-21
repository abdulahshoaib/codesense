import type {
  GitHubAuthorizeResponse,
  PublicUser
} from "@codesense/shared";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult
} from "@tanstack/react-query";

import { userService } from "@/features/settings/services/user.service";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";

export function useConnectGithub(): UseMutationResult<
  GitHubAuthorizeResponse,
  Error,
  void
> {
  return useMutation({
    mutationFn: () => userService.githubAuthorize(),
    onSuccess: (data) => {
      window.location.assign(data.url);
    }
  });
}

export function useDisconnectGithub(): UseMutationResult<
  PublicUser,
  Error,
  void
> {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: () => userService.githubDisconnect(),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me(), user);
      queryClient.invalidateQueries({
        queryKey: queryKeys.github.repositories()
      });
    }
  });
}
