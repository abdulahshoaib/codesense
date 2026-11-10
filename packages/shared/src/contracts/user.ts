export interface GitHubConnection {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface GitHubAuthorizeResponse {
  url: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  github?: GitHubConnection | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
