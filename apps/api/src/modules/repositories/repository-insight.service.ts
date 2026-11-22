import type {
  CommitHistoryDTO,
  ProjectContextDTO,
  RepositoryIssueDTO,
  RepositoryPullRequestDTO
} from "@codesense/shared";

import { ApiError } from "../../utils/ApiError.js";
import {
  getGithubAccessToken,
  listGithubCommits,
  listGithubIssues,
  listGithubPullRequests
} from "../github/github.service.js";
import { generateTextForUser } from "../llm/llm.service.js";
import { ProjectContext } from "./repository-insight.model.js";
import { toProjectContextDTO } from "./repository-insight.types.js";
import { repositoryService } from "./repository.service.js";
import type { RepositoryDocument } from "./repository.types.js";

const ISSUE_SUMMARY_CAP = 10;
const PR_SUMMARY_CAP = 10;

export async function getInsight(
  ownerId: string,
  repositoryId: string
): Promise<ProjectContextDTO> {
  const repository = await repositoryService.getOwnedRepository(
    ownerId,
    repositoryId
  );
  const document = await ProjectContext.findOne({
    repositoryId: repository._id,
    ownerId: repository.ownerId
  }).exec();

  if (!document) {
    const now = new Date().toISOString();

    return {
      repositoryId,
      context: "",
      issues: [],
      pullRequests: [],
      commits: [],
      createdAt: now,
      updatedAt: now
    };
  }

  return toProjectContextDTO(document);
}

export async function updateContext(
  repository: RepositoryDocument,
  context: string,
  lastCommitHash: string
): Promise<void> {
  await ProjectContext.findOneAndUpdate(
    {
      repositoryId: repository._id,
      ownerId: repository.ownerId
    },
    { $set: { context, lastCommitHash } },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).exec();
}

function summarizeIssue(
  userId: string,
  issue: Omit<RepositoryIssueDTO, "aiSummary">
): Promise<string | undefined> {
  const body = issue.body?.trim() ? `\n\n${issue.body}` : "";

  return generateTextForUser(userId, {
    system:
      "You explain GitHub issues in one or two plain sentences, focusing on the problem.",
    user: `Issue: ${issue.title}${body}`
  }).then((summary) => summary ?? undefined);
}

function summarizePullRequest(
  userId: string,
  pullRequest: Omit<RepositoryPullRequestDTO, "aiSummary">
): Promise<string | undefined> {
  const body = pullRequest.body?.trim() ? `\n\n${pullRequest.body}` : "";

  return generateTextForUser(userId, {
    system:
      "You explain what a pull request changes in one or two plain sentences.",
    user: `Pull request: ${pullRequest.title}${body}`
  }).then((summary) => summary ?? undefined);
}

async function withAiSummaries<T extends { title: string; body: string | null }>(
  items: T[],
  cap: number,
  summarize: (item: T) => Promise<string | undefined>
): Promise<Array<T & { aiSummary?: string }>> {
  const result: Array<T & { aiSummary?: string }> = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];

    if (index < cap) {
      const aiSummary = await summarize(item);
      result.push({ ...item, ...(aiSummary ? { aiSummary } : {}) });
    } else {
      result.push({ ...item });
    }
  }

  return result;
}

export async function refreshGithubData(
  ownerId: string,
  repositoryId: string
): Promise<void> {
  const repository = await repositoryService.getOwnedRepository(
    ownerId,
    repositoryId
  );

  if (repository.provider !== "github") {
    throw ApiError.badRequest(
      "GitHub data is only available for GitHub repositories",
      "GITHUB_INSIGHT_UNSUPPORTED"
    );
  }

  const accessToken = await getGithubAccessToken(ownerId);

  const [issues, pullRequests] = await Promise.all([
    listGithubIssues(accessToken, repository.url),
    listGithubPullRequests(accessToken, repository.url)
  ]);

  const [summarizedIssues, summarizedPullRequests] = await Promise.all([
    withAiSummaries(issues, ISSUE_SUMMARY_CAP, (issue) =>
      summarizeIssue(ownerId, issue)
    ),
    withAiSummaries(pullRequests, PR_SUMMARY_CAP, (pullRequest) =>
      summarizePullRequest(ownerId, pullRequest)
    )
  ]);

  await ProjectContext.findOneAndUpdate(
    {
      repositoryId: repository._id,
      ownerId: repository.ownerId
    },
    {
      $set: {
        issues: summarizedIssues,
        pullRequests: summarizedPullRequests
      },
      $setOnInsert: { context: "" }
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true
    }
  ).exec();
}

export async function listCommits(
  ownerId: string,
  repositoryId: string
): Promise<CommitHistoryDTO[]> {
  const repository = await repositoryService.getOwnedRepository(
    ownerId,
    repositoryId
  );

  if (repository.provider !== "github") {
    throw ApiError.badRequest(
      "Commit history is only available for GitHub repositories",
      "GITHUB_INSIGHT_UNSUPPORTED"
    );
  }

  const accessToken = await getGithubAccessToken(ownerId);

  return listGithubCommits(
    accessToken,
    repository.url,
    repository.defaultBranch
  );
}

export const repositoryInsightService = {
  getInsight,
  updateContext,
  refreshGithubData,
  listCommits
};
