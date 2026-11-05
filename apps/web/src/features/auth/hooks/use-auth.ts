import type { AuthResponse, LoginInput, RegisterInput } from "@codesense/shared";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

import { authService } from "@/features/auth/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

export function useLogin(): UseMutationResult<
  AuthResponse,
  Error,
  LoginInput
> {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      setSession(data.token, data.user);
    }
  });
}

export function useRegister(): UseMutationResult<
  AuthResponse,
  Error,
  RegisterInput
> {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      setSession(data.token, data.user);
    }
  });
}
