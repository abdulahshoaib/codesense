export type IssueState = "open" | "closed";
export type PullRequestState = "open" | "closed" | "merged";

export interface RepositoryIssueDTO {
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  url: string;
  author: string | null;
  createdAt: string;
  aiSummary?: string;
}

export interface RepositoryPullRequestDTO {
  number: number;
  title: string;
  body: string | null;
  state: PullRequestState;
  url: string;
  author: string | null;
  createdAt: string;
  aiSummary?: string;
}

export interface CommitHistoryDTO {
  sha: string;
  message: string;
  author: string | null;
  committedAt: string;
  url: string;
  parents: string[];
}

export interface ProjectContextDTO {
  repositoryId: string;
  context: string;
  lastCommitHash?: string;
  issues: RepositoryIssueDTO[];
  pullRequests: RepositoryPullRequestDTO[];
  commits: CommitHistoryDTO[];
  createdAt: string;
  updatedAt: string;
}
