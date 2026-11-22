import type {
  LlmModelsResponse,
  LlmProvider,
  PublicUser
} from "@codesense/shared";
import {
  getDefaultLlmModel,
  getProviderDefaultModel,
  isKnownLlmModel,
  llmModels
} from "@codesense/shared";

import { env } from "../../config/env.js";
import { summarizeCodebase, type CodebaseSummaryInput } from "../../services/ai.service.js";
import {
  decryptSecret,
  encryptSecret
} from "../../services/encryption.service.js";
import {
  AuthError,
  RateLimitError
} from "../../services/llm/errors.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../users/user.model.js";
import { toPublicUser, type UserDocument } from "../users/user.types.js";

const LLM_KEYS_SELECT = "+llmKeys.groq +llmKeys.openrouter";

const PROVIDER_LABELS: Record<LlmProvider, string> = {
  groq: "Groq",
  openrouter: "OpenRouter"
};

function serverApiKey(provider: LlmProvider): string {
  return provider === "groq" ? env.GROQ_API_KEY : env.OPENROUTER_API_KEY;
}

function parseFallbackOrder(): LlmProvider[] {
  return env.LLM_FALLBACK_ORDER.split(",")
    .map((value) => value.trim())
    .filter((value): value is LlmProvider => value === "groq" || value === "openrouter");
}

function hasUserKey(user: UserDocument, provider: LlmProvider): boolean {
  return Boolean(user.llmKeys?.[provider]);
}

function isProviderAvailable(
  user: UserDocument,
  provider: LlmProvider
): boolean {
  return hasUserKey(user, provider) || Boolean(serverApiKey(provider));
}

async function resolveApiKey(
  user: UserDocument,
  provider: LlmProvider
): Promise<string | undefined> {
  const encrypted = user.llmKeys?.[provider];

  if (encrypted) {
    return decryptSecret(encrypted);
  }

  return serverApiKey(provider) || undefined;
}

async function loadUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId).select(LLM_KEYS_SELECT).exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return user;
}

export async function getModels(userId: string): Promise<LlmModelsResponse> {
  const user = await loadUser(userId);
  const availableProviders = (
    ["groq", "openrouter"] as LlmProvider[]
  ).filter((provider) => isProviderAvailable(user, provider));

  return {
    models: llmModels,
    availableProviders,
    preference: user.llmPreference
      ? {
          provider: user.llmPreference.provider,
          modelId: user.llmPreference.modelId,
          fallbackEnabled: user.llmPreference.fallbackEnabled
        }
      : null
  };
}

export async function updatePreference(
  userId: string,
  input: { provider: LlmProvider; modelId: string; fallbackEnabled: boolean }
): Promise<PublicUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { llmPreference: input } },
    { new: true, runValidators: true }
  )
    .select(LLM_KEYS_SELECT)
    .exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export async function setKey(
  userId: string,
  provider: LlmProvider,
  apiKey: string
): Promise<PublicUser> {
  const encrypted = encryptSecret(apiKey);
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { [`llmKeys.${provider}`]: encrypted } },
    { new: true, runValidators: true }
  )
    .select(LLM_KEYS_SELECT)
    .exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export async function deleteKey(
  userId: string,
  provider: LlmProvider
): Promise<PublicUser> {
  const user = await User.findByIdAndUpdate(
    userId,
    { $unset: { [`llmKeys.${provider}`]: 1 } },
    { new: true }
  )
    .select(LLM_KEYS_SELECT)
    .exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export interface ResolvedLlmSelection {
  provider: LlmProvider;
  modelId: string;
  fallbackEnabled: boolean;
}

export function resolveSelection(
  user: UserDocument,
  override?: { provider?: LlmProvider; modelId?: string }
): ResolvedLlmSelection | null {
  const fallbackEnabled = user.llmPreference?.fallbackEnabled ?? false;

  if (
    override?.provider &&
    override.modelId &&
    isKnownLlmModel(override.provider, override.modelId) &&
    isProviderAvailable(user, override.provider)
  ) {
    return {
      provider: override.provider,
      modelId: override.modelId,
      fallbackEnabled
    };
  }

  if (
    user.llmPreference &&
    isProviderAvailable(user, user.llmPreference.provider)
  ) {
    return {
      provider: user.llmPreference.provider,
      modelId: user.llmPreference.modelId,
      fallbackEnabled: user.llmPreference.fallbackEnabled
    };
  }

  const defaultModel = getDefaultLlmModel();
  if (isProviderAvailable(user, defaultModel.provider)) {
    return {
      provider: defaultModel.provider,
      modelId: defaultModel.modelId,
      fallbackEnabled
    };
  }

  return null;
}

function findFallbackModel(provider: LlmProvider): string {
  return getProviderDefaultModel(provider).modelId;
}

function formatRateLimitMessage(
  provider: LlmProvider,
  modelId: string,
  retryAfterSeconds?: number
): string {
  const minutes = retryAfterSeconds
    ? Math.max(1, Math.ceil(retryAfterSeconds / 60))
    : 12;

  return `${PROVIDER_LABELS[provider]} free-tier limit reached for ${modelId}. Try again in ~${minutes} min or switch models in Settings.`;
}

export interface CodebaseSummaryResult {
  aiSummary: string | null;
  provider: LlmProvider;
  modelId: string;
  fallbackUsed: boolean;
  aiError?: string;
}

function nextAvailableProvider(
  user: UserDocument,
  failedProvider: LlmProvider
): LlmProvider | null {
  const order = parseFallbackOrder();
  const failedIndex = order.indexOf(failedProvider);

  if (failedIndex === -1) {
    return null;
  }

  for (let offset = 1; offset < order.length; offset += 1) {
    const provider = order[(failedIndex + offset) % order.length];
    if (isProviderAvailable(user, provider)) {
      return provider;
    }
  }

  return null;
}

async function tryFallback(
  user: UserDocument,
  failedProvider: LlmProvider,
  input: CodebaseSummaryInput
): Promise<CodebaseSummaryResult | null> {
  const provider = nextAvailableProvider(user, failedProvider);

  if (!provider) {
    return null;
  }

  const modelId = findFallbackModel(provider);
  const apiKey = await resolveApiKey(user, provider);

  if (!apiKey) {
    return null;
  }

  try {
    const aiSummary = await summarizeCodebase({
      ...input,
      provider,
      modelId,
      apiKey
    });

    return { aiSummary, provider, modelId, fallbackUsed: true };
  } catch (error) {
    if (error instanceof RateLimitError) {
      return {
        aiSummary: null,
        provider,
        modelId,
        fallbackUsed: true,
        aiError: formatRateLimitMessage(provider, modelId, error.retryAfterSeconds)
      };
    }

    if (error instanceof AuthError) {
      return {
        aiSummary: null,
        provider,
        modelId,
        fallbackUsed: true,
        aiError: `Invalid or missing API key for ${PROVIDER_LABELS[provider]}`
      };
    }

    return {
      aiSummary: null,
      provider,
      modelId,
      fallbackUsed: true,
      aiError: "AI summary unavailable"
    };
  }
}

export async function summarizeCodebaseForScan(
  userId: string,
  override: { provider?: LlmProvider; modelId?: string } | undefined,
  input: CodebaseSummaryInput
): Promise<CodebaseSummaryResult | null> {
  const user = await loadUser(userId);
  const selection = resolveSelection(user, override);

  if (!selection) {
    return null;
  }

  const apiKey = await resolveApiKey(user, selection.provider);

  if (!apiKey) {
    return null;
  }

  try {
    const aiSummary = await summarizeCodebase({
      ...input,
      provider: selection.provider,
      modelId: selection.modelId,
      apiKey
    });

    return {
      aiSummary,
      provider: selection.provider,
      modelId: selection.modelId,
      fallbackUsed: false
    };
  } catch (error) {
    if (error instanceof RateLimitError) {
      if (selection.fallbackEnabled) {
        const fallback = await tryFallback(user, selection.provider, input);
        if (fallback) {
          return fallback;
        }
      }

      return {
        aiSummary: null,
        provider: selection.provider,
        modelId: selection.modelId,
        fallbackUsed: false,
        aiError: formatRateLimitMessage(
          selection.provider,
          selection.modelId,
          error.retryAfterSeconds
        )
      };
    }

    if (error instanceof AuthError) {
      return {
        aiSummary: null,
        provider: selection.provider,
        modelId: selection.modelId,
        fallbackUsed: false,
        aiError: `Invalid or missing API key for ${PROVIDER_LABELS[selection.provider]}`
      };
    }

    return {
      aiSummary: null,
      provider: selection.provider,
      modelId: selection.modelId,
      fallbackUsed: false,
      aiError: "AI summary unavailable"
    };
  }
}

export const llmService = {
  getModels,
  updatePreference,
  setKey,
  deleteKey,
  resolveSelection,
  summarizeCodebaseForScan
};
