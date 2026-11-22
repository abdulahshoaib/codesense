import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GithubRepoPicker } from "@/features/repositories/components/github-repo-picker";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  createRepository: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/features/repositories/hooks/use-github-repositories", () => ({
  useGithubRepositories: () => ({
    data: [
      {
        id: 1,
        name: "codesense",
        fullName: "acme/codesense",
        url: "https://github.com/acme/codesense",
        defaultBranch: "main",
        description: "Code intelligence",
        private: false
      }
    ],
    isLoading: false,
    isError: false,
    error: null
  })
}));

vi.mock("@/features/repositories/hooks/use-repositories", () => ({
  useRepositories: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null
  }),
  useCreateRepository: () => ({
    mutate: (variables: unknown, options?: { onSuccess?: () => void }) => {
      mocks.createRepository(variables);
      options?.onSuccess?.();
    },
    isPending: false,
    isError: false,
    error: null,
    variables: undefined
  })
}));

describe("GithubRepoPicker", () => {
  it("navigates to the scans page after connecting a repository", async () => {
    const testUser = userEvent.setup();

    renderWithProviders(<GithubRepoPicker />);

    await testUser.click(screen.getByRole("button", { name: "Connect" }));

    expect(mocks.createRepository).toHaveBeenCalledWith({
      name: "codesense",
      url: "https://github.com/acme/codesense",
      provider: "github",
      defaultBranch: "main",
      description: "Code intelligence",
      githubFullName: "acme/codesense"
    });
    expect(mocks.navigate).toHaveBeenCalledWith("/scans");
  });
});
