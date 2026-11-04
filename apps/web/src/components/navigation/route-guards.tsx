import { Navigate, Outlet, useLocation } from "react-router-dom";

import { FullPageSpinner } from "@/components/ui/spinner";
import { useAuthStore } from "@/stores/auth.store";

export function ProtectedRoute(): React.ReactElement {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();

  if (status === "uninitialized" || status === "loading") {
    return <FullPageSpinner label="Restoring your session" />;
  }

  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute(): React.ReactElement {
  const status = useAuthStore((state) => state.status);

  if (status === "uninitialized" || status === "loading") {
    return <FullPageSpinner label="Restoring your session" />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
