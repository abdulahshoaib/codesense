import type { BranchDTO, GithubRepositoryDTO, PublicUser } from "@codesense/shared";

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
