import type {
  CommitHistoryDTO,
  IssueState,
  ProjectContextDTO,
  PullRequestState
} from "@codesense/shared";
import type { Types } from "mongoose";

export interface InsightIssueDocument {
  number: number;
  title: string;
  body: string | null;
  state: IssueState;
  url: string;
  author: string | null;
  createdAt: string;
  aiSummary?: string;
}

export interface InsightPullRequestDocument {
  number: number;
  title: string;
  body: string | null;
  state: PullRequestState;
  url: string;
  author: string | null;
  createdAt: string;
  aiSummary?: string;
}

export interface ProjectContextDocument {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  ownerId: Types.ObjectId;
  context: string;
  lastCommitHash?: string;
  issues: InsightIssueDocument[];
  pullRequests: InsightPullRequestDocument[];
  commits: CommitHistoryDTO[];
  createdAt: Date;
  updatedAt: Date;
}

export function toProjectContextDTO(
  document: ProjectContextDocument
): ProjectContextDTO {
  return {
    repositoryId: document.repositoryId.toString(),
    context: document.context,
    ...(document.lastCommitHash !== undefined
      ? { lastCommitHash: document.lastCommitHash }
      : {}),
    issues: document.issues ?? [],
    pullRequests: document.pullRequests ?? [],
    commits: document.commits ?? [],
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };
}
