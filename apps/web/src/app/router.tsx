import { Navigate, createBrowserRouter } from "react-router-dom";

import { NotFoundPage } from "@/app/not-found-page";
import { AppLayout } from "@/components/layout/app-layout";
import {
  ProtectedRoute,
  PublicOnlyRoute
} from "@/components/navigation/route-guards";

type PageModule = Record<string, React.ComponentType>;

function page(load: () => Promise<PageModule>, exportName: string) {
  return async () => {
    const module = await load();
    const Component = module[exportName];

    if (!Component) {
      throw new Error(`Page export "${exportName}" was not found`);
    }

    return { Component };
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard" replace />
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        path: "/login",
        lazy: page(() => import("@/features/auth/pages/login-page"), "LoginPage")
      },
      {
        path: "/register",
        lazy: page(
          () => import("@/features/auth/pages/register-page"),
          "RegisterPage"
        )
      }
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: "/dashboard",
            lazy: page(
              () => import("@/features/dashboard/pages/dashboard-page"),
              "DashboardPage"
            )
          },
          {
            path: "/repositories",
            lazy: page(
              () => import("@/features/repositories/pages/repositories-page"),
              "RepositoriesPage"
            )
          },
          {
            path: "/repositories/connect",
            lazy: page(
              () =>
                import(
                  "@/features/repositories/pages/connect-repository-page"
                ),
              "ConnectRepositoryPage"
            )
          },
          {
            path: "/repositories/:id",
            lazy: page(
              () =>
                import(
                  "@/features/repositories/pages/repository-detail-page"
                ),
              "RepositoryDetailPage"
            )
          },
          {
            path: "/scans",
            lazy: page(
              () => import("@/features/scans/pages/scans-page"),
              "ScansPage"
            )
          },
          {
            path: "/scans/:id",
            lazy: page(
              () => import("@/features/scans/pages/scan-detail-page"),
              "ScanDetailPage"
            )
          },
          {
            path: "/settings",
            lazy: page(
              () => import("@/features/settings/pages/settings-page"),
              "SettingsPage"
            )
          }
        ]
      }
    ]
  },
  {
    path: "*",
    element: <NotFoundPage />
  }
]);
