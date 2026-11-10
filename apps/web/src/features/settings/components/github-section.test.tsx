import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  githubAuthorize: vi.fn(),
  githubDisconnect: vi.fn()
}));

vi.mock("@/features/settings/services/user.service", () => ({
  userService: {
    updateProfile: vi.fn(),
    githubAuthorize: mocks.githubAuthorize,
    githubDisconnect: mocks.githubDisconnect
  }
}));

const { GitHubSection } = await import(
  "@/features/settings/components/github-section"
);
const { renderWithProviders } = await import("@/test/render");
const { useAuthStore } = await import("@/stores/auth.store");

const baseUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  github: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("GitHubSection", () => {
  beforeEach(() => {
    mocks.githubAuthorize.mockReset();
    mocks.githubDisconnect.mockReset();
    useAuthStore.setState({ user: null, token: null, status: "uninitialized" });
  });

  it("renders a connect action when no GitHub account is linked", () => {
    useAuthStore.setState({ user: baseUser, status: "authenticated" });
    renderWithProviders(<GitHubSection />, { route: "/settings" });

    expect(
      screen.getByRole("button", { name: "Connect GitHub" })
    ).toBeInTheDocument();
  });

  it("renders the linked account when GitHub is connected", () => {
    useAuthStore.setState({
      user: {
        ...baseUser,
        github: { login: "ada", name: "Ada Lovelace", avatarUrl: null }
      },
      status: "authenticated"
    });
    renderWithProviders(<GitHubSection />, { route: "/settings" });

    expect(screen.getByText("@ada")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Disconnect" })
    ).toBeInTheDocument();
  });
});
