import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";

import { useAuthBootstrap } from "@/features/auth/hooks/use-auth-bootstrap";
import { createQueryClient } from "@/lib/query-client";
import { startSystemThemeSync } from "@/stores/theme.store";

function ThemeSync(): null {
  useEffect(() => startSystemThemeSync(), []);
  return null;
}

function AuthBootstrap(): null {
  useAuthBootstrap();
  return null;
}

export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({
  children
}: AppProvidersProps): React.ReactElement {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <AuthBootstrap />
      {children}
    </QueryClientProvider>
  );
}
