import crypto from "node:crypto";

import type {
  BranchDTO,
  CommitHistoryDTO,
  GithubRepositoryDTO,
  PublicUser,
  RepositoryIssueDTO,
  RepositoryPullRequestDTO
} from "@codesense/shared";

import { env } from "../../config/env.js";
import {
  decryptSecret,
  encryptSecret
} from "../../services/encryption.service.js";
import {
  signOAuthState,
  verifyOAuthState
} from "../../services/token.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../users/user.model.js";
import { toPublicUser } from "../users/user.types.js";
import type {
  GithubBranch,
  GithubCommit,
  GithubIssue,
  GithubPullRequest,
  GithubRepository,
  GithubTokenResponse,
  GithubUser
} from "./github.types.js";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const SCOPES = "read:user user:email repo";

function assertConfigured(): void {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    throw ApiError.internal(
      "GitHub OAuth is not configured",
      "GITHUB_OAUTH_NOT_CONFIGURED"
    );
  }
}

export function getAuthorizeUrl(userId: string): { url: string } {
  assertConfigured();

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: SCOPES,
    state: signOAuthState(userId)
  });

  return { url: `${GITHUB_AUTHORIZE_URL}?${params.toString()}` };
}

async function exchangeCode(code: string): Promise<string> {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "codesense"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI
    })
  });

  const data = (await response.json()) as GithubTokenResponse;

  if (!response.ok || data.error || !data.access_token) {
    throw ApiError.badRequest(
      data.error_description ?? "Failed to exchange GitHub authorization code",
      "GITHUB_OAUTH_FAILED"
    );
  }

  return data.access_token;
}

async function fetchGithubUser(accessToken: string): Promise<GithubUser> {
  const response = await fetch(`${env.GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "codesense"
    }
  });

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub profile",
      "GITHUB_PROFILE_FAILED"
    );
  }

  return (await response.json()) as GithubUser;
}

export async function getGithubAccessToken(userId: string): Promise<string> {
  const user = await User.findById(userId).select("+github.accessToken").exec();
  const accessToken = user?.github?.accessToken;

  if (!accessToken) {
    throw ApiError.badRequest(
      "GitHub account is not connected",
      "GITHUB_NOT_CONNECTED"
    );
  }

  return decryptSecret(accessToken);
}

export function buildGithubCloneUrl(
  repositoryUrl: string,
  accessToken: string
): string {
  const normalized = repositoryUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const url = new URL(normalized);
  url.username = "x-access-token";
  url.password = accessToken;

  return `${url.toString()}.git`;
}

function parseGithubRepository(
  repositoryUrl: string
): { owner: string; repo: string } {
  const normalized = repositoryUrl.replace(/\.git$/, "").replace(/\/$/, "");
  const url = new URL(normalized);
  const segments = url.pathname.split("/").filter(Boolean);

  return { owner: segments[0] ?? "", repo: segments[1] ?? "" };
}

export function githubFullNameFromUrl(repositoryUrl: string): string | null {
  try {
    const { owner, repo } = parseGithubRepository(repositoryUrl);

    if (!owner || !repo) {
      return null;
    }

    return `${owner}/${repo}`;
  } catch {
    return null;
  }
}

export async function listGithubBranches(
  accessToken: string,
  repositoryUrl: string
): Promise<BranchDTO[]> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/branches?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub branches",
      "GITHUB_BRANCHES_FETCH_FAILED"
    );
  }

  const branches = (await response.json()) as GithubBranch[];

  return branches.map((branch) => ({
    name: branch.name,
    commitHash: branch.commit?.sha ?? ""
  }));
}

export async function listGithubRepositories(
  userId: string
): Promise<GithubRepositoryDTO[]> {
  const accessToken = await getGithubAccessToken(userId);

  const response = await fetch(
    `${env.GITHUB_API_URL}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub repositories",
      "GITHUB_REPOS_FETCH_FAILED"
    );
  }

  const repos = (await response.json()) as GithubRepository[];

  return repos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    url: repo.html_url,
    defaultBranch: repo.default_branch ?? "main",
    description: repo.description,
    private: repo.private
  }));
}

export async function listGithubIssues(
  accessToken: string,
  repositoryUrl: string
): Promise<Array<Omit<RepositoryIssueDTO, "aiSummary">>> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/issues?state=open&per_page=50&sort=created&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub issues",
      "GITHUB_ISSUES_FETCH_FAILED"
    );
  }

  const issues = (await response.json()) as GithubIssue[];

  return issues
    .filter((issue) => issue.pull_request === undefined)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state === "closed" ? "closed" : "open",
      url: issue.html_url,
      author: issue.user?.login ?? null,
      createdAt: issue.created_at
    }));
}

export async function listGithubPullRequests(
  accessToken: string,
  repositoryUrl: string
): Promise<Array<Omit<RepositoryPullRequestDTO, "aiSummary">>> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/pulls?state=all&per_page=50&sort=created&direction=desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub pull requests",
      "GITHUB_PULLS_FETCH_FAILED"
    );
  }

  const pulls = (await response.json()) as GithubPullRequest[];

  return pulls.map((pr) => ({
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.merged_at
      ? "merged"
      : pr.state === "closed"
        ? "closed"
        : "open",
    url: pr.html_url,
    author: pr.user?.login ?? null,
    createdAt: pr.created_at
  }));
}

export async function listGithubCommits(
  accessToken: string,
  repositoryUrl: string,
  branch: string
): Promise<CommitHistoryDTO[]> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=50`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to fetch GitHub commits",
      "GITHUB_COMMITS_FETCH_FAILED"
    );
  }

  const commits = (await response.json()) as GithubCommit[];

  return commits.map((commit) => ({
    sha: commit.sha,
    message: commit.commit?.message ?? "",
    author: commit.commit?.author?.name ?? commit.author?.login ?? null,
    committedAt:
      commit.commit?.committer?.date ?? commit.commit?.author?.date ?? "",
    url: commit.html_url,
    parents: (commit.parents ?? [])
      .map((parent) => parent.sha)
      .filter((sha): sha is string => Boolean(sha))
  }));
}

export async function createGithubWebhook(
  accessToken: string,
  repositoryUrl: string,
  webhookUrl: string,
  secret: string
): Promise<{ id: number }> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "web",
        active: true,
        events: ["push"],
        config: {
          url: webhookUrl,
          content_type: "json",
          secret
        }
      })
    }
  );

  if (!response.ok) {
    throw ApiError.internal(
      "Failed to create GitHub webhook",
      "GITHUB_WEBHOOK_CREATE_FAILED"
    );
  }

  const hook = (await response.json()) as { id: number };

  return { id: hook.id };
}

export async function deleteGithubWebhook(
  accessToken: string,
  repositoryUrl: string,
  webhookId: number
): Promise<void> {
  const { owner, repo } = parseGithubRepository(repositoryUrl);

  const response = await fetch(
    `${env.GITHUB_API_URL}/repos/${owner}/${repo}/hooks/${webhookId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "codesense"
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    throw ApiError.internal(
      "Failed to delete GitHub webhook",
      "GITHUB_WEBHOOK_DELETE_FAILED"
    );
  }
}

export function verifyGithubWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) {
    return false;
  }

  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

export async function completeAuthorization(
  code: string,
  state: string
): Promise<void> {
  const userId = verifyOAuthState(state);
  const accessToken = await exchangeCode(code);
  const githubUser = await fetchGithubUser(accessToken);

  const existing = await User.findOne({
    "github.id": githubUser.id,
    _id: { $ne: userId }
  }).exec();

  if (existing) {
    throw ApiError.conflict(
      "This GitHub account is already connected to another CodeSense account",
      "GITHUB_ACCOUNT_IN_USE"
    );
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        github: {
          id: githubUser.id,
          login: githubUser.login,
          name: githubUser.name ?? null,
          avatarUrl: githubUser.avatar_url ?? null,
          accessToken: encryptSecret(accessToken),
          connectedAt: new Date()
        }
      }
    },
    { new: true, runValidators: true }
  ).exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }
}

export async function disconnect(userId: string): Promise<PublicUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $unset: { github: 1 } },
    { new: true }
  )
    .select("+llmKeys.groq +llmKeys.openrouter")
    .exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}
