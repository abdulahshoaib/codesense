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
