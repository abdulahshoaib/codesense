import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { authService } from "@/features/auth/services/auth.service";
import { UNAUTHORIZED_EVENT } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth.store";

export interface AuthBootstrapResult {
  isBootstrapping: boolean;
}

export function useAuthBootstrap(): AuthBootstrapResult {
  const token = useAuthStore((state) => state.token);
  const status = useAuthStore((state) => state.status);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const clearSession = useAuthStore((state) => state.clearSession);

  const query = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: authService.me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60_000
  });

  useEffect(() => {
    const handleUnauthorized = (): void => {
      useAuthStore.getState().clearSession();
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    if (!token) {
      if (status !== "unauthenticated") {
        clearSession();
      }
      return;
    }

    if (query.isPending) {
      setLoading();
      return;
    }

    if (query.isSuccess) {
      setUser(query.data);
      return;
    }

    if (query.isError) {
      clearSession();
    }
  }, [
    token,
    status,
    query.isPending,
    query.isSuccess,
    query.isError,
    query.data,
    setLoading,
    setUser,
    clearSession
  ]);

  return {
    isBootstrapping:
      Boolean(token) && (status === "uninitialized" || status === "loading")
  };
}
