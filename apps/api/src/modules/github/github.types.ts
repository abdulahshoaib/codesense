export interface GithubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GithubUser {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string | null;
}

export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  default_branch: string | null;
  description: string | null;
  private: boolean;
}

export interface GithubBranch {
  name: string;
  commit: {
    sha: string;
  } | null;
}

export interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string } | null;
  created_at: string;
  pull_request?: unknown;
}

export interface GithubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: { login: string } | null;
  created_at: string;
  merged_at: string | null;
}

export interface GithubCommit {
  sha: string;
  html_url: string;
  author: { login: string } | null;
  parents?: Array<{ sha?: string }> | null;
  commit: {
    message: string;
    author: { name: string; date: string } | null;
    committer: { date: string } | null;
  } | null;
}

export interface GithubWebhookPushPayload {
  ref?: string;
  after?: string;
  repository?: {
    full_name?: string;
  };
}
