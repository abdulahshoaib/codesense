import type { ProjectContextDTO } from "@codesense/shared";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  layoutCommitGraph,
  RepositoryActivity,
  RepositoryInsightPanel
} from "@/features/repositories/components/repository-insight-panel";
import { renderWithProviders } from "@/test/render";

const insight: ProjectContextDTO = {
  repositoryId: "repo-1",
  context: `Current implementation
A small API with a scan pipeline.

Future
Add a retry when a scan fails on an empty repository.`,
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
    },
    {
      number: 9,
      title: "Old crash",
      body: "Already fixed.",
      state: "closed",
      url: "https://github.com/acme/codesense/issues/9",
      author: "ada",
      createdAt: "2026-10-01T00:00:00.000Z"
    }
  ],
  pullRequests: [
    {
      number: 8,
      title: "Queue scans in the background",
      body: null,
      state: "open",
      url: "https://github.com/acme/codesense/pull/8",
      author: "ada",
      createdAt: "2026-11-02T00:00:00.000Z",
      aiSummary: "Runs repository scans after they are queued."
    }
  ],
  commits: [
    {
      sha: "abc123def456",
      message: "Initial commit\n\nLonger body",
      author: "Ada",
      committedAt: "2026-11-01T00:00:00.000Z",
      url: "https://github.com/acme/codesense/commit/abc123def456",
      parents: []
    }
  ],
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
  useRepositoryCommits: () => ({
    data: insight.commits,
    isLoading: false,
    isFetching: false,
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
  it("describes the current implementation and future separately from issues", () => {
    renderWithProviders(<RepositoryInsightPanel repositoryId="repo-1" />);

    expect(
      screen.getByText("A small API with a scan pipeline.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add a retry when a scan fails on an empty repository.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("#4 Scan fails on empty repos")).not.toBeInTheDocument();
  });

  it("shows open issues, pull request changes, and commit history on their own", () => {
    const { rerender } = renderWithProviders(
      <RepositoryActivity repositoryId="repo-1" section="issues" />
    );

    expect(screen.getByText("#4 Scan fails on empty repos")).toBeInTheDocument();
    expect(
      screen.getByText("Scans crash when a repository has no files.")
    ).toBeInTheDocument();
    expect(screen.queryByText("#9 Old crash")).not.toBeInTheDocument();

    rerender(<RepositoryActivity repositoryId="repo-1" section="pulls" />);

    expect(
      screen.getByText("Runs repository scans after they are queued.")
    ).toBeInTheDocument();

    rerender(<RepositoryActivity repositoryId="repo-1" section="history" />);

    expect(screen.getByText("Initial commit")).toBeInTheDocument();
    expect(screen.getByText(/Ada · abc123de/)).toBeInTheDocument();
  });
});

describe("layoutCommitGraph", () => {
  it("keeps the first parent on the same lane and opens a lane for the merge", () => {
    const commit = (
      sha: string,
      parents: string[]
    ): ProjectContextDTO["commits"][number] => ({
      sha,
      message: sha,
      author: null,
      committedAt: "2026-11-01T00:00:00.000Z",
      url: `https://github.com/acme/codesense/commit/${sha}`,
      parents
    });

    const rows = layoutCommitGraph([
      commit("m", ["a", "c"]),
      commit("a", ["b"]),
      commit("c", ["b"]),
      commit("b", [])
    ]);

    expect(rows.map((row) => [row.commit.sha, row.lane])).toEqual([
      ["m", 0],
      ["a", 0],
      ["c", 1],
      ["b", 0]
    ]);
  });
});
