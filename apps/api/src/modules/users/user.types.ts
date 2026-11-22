import type { LlmProvider, PublicUser } from "@codesense/shared";
import type { Types } from "mongoose";

export interface GithubProfileDocument {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  accessToken: string;
  connectedAt: Date;
}

export interface LlmKeysDocument {
  groq?: string;
  openrouter?: string;
}

export interface LlmPreferenceDocument {
  provider: LlmProvider;
  modelId: string;
  fallbackEnabled: boolean;
}

export interface UserDocument {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  github?: GithubProfileDocument;
  llmKeys?: LlmKeysDocument;
  llmPreference?: LlmPreferenceDocument;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    github: user.github
      ? {
          login: user.github.login,
          name: user.github.name,
          avatarUrl: user.github.avatarUrl
        }
      : null,
    llmKeys: {
      groq: Boolean(user.llmKeys?.groq),
      openrouter: Boolean(user.llmKeys?.openrouter)
    },
    ...(user.llmPreference
      ? {
          llmPreference: {
            provider: user.llmPreference.provider,
            modelId: user.llmPreference.modelId,
            fallbackEnabled: user.llmPreference.fallbackEnabled
          }
        }
      : {}),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}
