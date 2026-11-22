import type { LlmKeyStatus, LlmPreference } from "./llm.js";

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
  llmKeys?: LlmKeyStatus;
  llmPreference?: LlmPreference | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: PublicUser;
}
