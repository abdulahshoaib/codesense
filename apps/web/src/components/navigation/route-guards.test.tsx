import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  ProtectedRoute,
  PublicOnlyRoute
} from "@/components/navigation/route-guards";
import { useAuthStore } from "@/stores/auth.store";
import { createTestQueryClient } from "@/test/render";

function renderRoutes(initialEntry: string): void {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<p>Dashboard content</p>} />
          </Route>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/register" element={<p>Register page</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("route guards", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      status: "uninitialized"
    });
  });

  it("redirects unauthenticated users to the login page", () => {
    useAuthStore.setState({ status: "unauthenticated" });
    renderRoutes("/dashboard");

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    useAuthStore.setState({
      status: "authenticated",
      token: "signed.jwt.token",
      user: {
        id: "1",
        name: "Ada",
        email: "ada@example.com",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z"
      }
    });
    renderRoutes("/dashboard");

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("redirects authenticated users away from public-only routes", () => {
    useAuthStore.setState({ status: "authenticated", token: "signed.jwt.token" });
    renderRoutes("/register");

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.queryByText("Register page")).not.toBeInTheDocument();
  });

  it("shows a loading state while the session is being restored", () => {
    useAuthStore.setState({ status: "loading" });
    renderRoutes("/dashboard");

    expect(screen.getByText("Restoring your session")).toBeInTheDocument();
  });
});
