import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useCallback } from "react";

import { useAuthStore } from "@/stores/auth.store";

export function useLogout(): () => void {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useCallback(() => {
    clearSession();
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [clearSession, queryClient, navigate]);
}
