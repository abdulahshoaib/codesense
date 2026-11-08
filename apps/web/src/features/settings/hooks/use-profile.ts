import type { PublicUser, UpdateProfileInput } from "@codesense/shared";
import {
  useMutation,
  useQueryClient,
  type UseMutationResult
} from "@tanstack/react-query";

import { userService } from "@/features/settings/services/user.service";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";

export function useUpdateProfile(): UseMutationResult<
  PublicUser,
  Error,
  UpdateProfileInput
> {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: userService.updateProfile,
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(queryKeys.auth.me(), user);
    }
  });
}
