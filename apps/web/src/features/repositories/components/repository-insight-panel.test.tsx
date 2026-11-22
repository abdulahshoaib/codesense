import type { ProjectContextDTO } from "@codesense/shared";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RepositoryInsightPanel } from "@/features/repositories/components/repository-insight-panel";
import { renderWithProviders } from "@/test/render";

const insight: ProjectContextDTO = {
  repositoryId: "repo-1",
  context: "A small API with a scan pipeline.",
  issues: [
    {
      number: 4,
      title: "Scan fails on empty repos",
      body: null,
      state: "open",
      url: "https://github.com/acme/codesense/issues/4",
      author: "ada",
      createdAt: "2026-11-01T00:00:00.000Z",
      aiSummary: "Scans crash when a repository has no files."
    }
  ],
  pullRequests: [],
  commits: [],
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-02T00:00:00.000Z"
};

vi.mock("@/features/repositories/hooks/use-repositories", () => ({
  useRepositoryInsight: () => ({
    data: insight,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn()
  }),
  useRefreshRepositoryInsight: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null
  })
}));

describe("RepositoryInsightPanel", () => {
  it("shows the saved overview, issue summary, and refresh action", () => {
    renderWithProviders(
      <RepositoryInsightPanel repositoryId="repo-1" provider="github" />
    );

    expect(
      screen.getByText("A small API with a scan pipeline.")
    ).toBeInTheDocument();
    expect(screen.getByText("#4 Scan fails on empty repos")).toBeInTheDocument();
    expect(
      screen.getByText("Scans crash when a repository has no files.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });
});
