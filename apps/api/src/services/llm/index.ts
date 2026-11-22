import type { LlmProvider as LlmProviderId } from "@codesense/shared";

import { OpenAiCompatibleProvider } from "./openai-compatible.js";
import type {
  LlmProvider,
  LlmProviderConfig
} from "./types.js";

export interface ProviderDescriptor {
  baseUrl: string;
  extraHeaders?: Record<string, string>;
}

export const LLM_PROVIDERS: Record<LlmProviderId, ProviderDescriptor> = {
  groq: {
    baseUrl: "https://api.groq.com/openai/v1"
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    extraHeaders: {
      "HTTP-Referer": "https://codesense.app",
      "X-Title": "CodeSense"
    }
  }
};

export function createLlmProvider(config: LlmProviderConfig): LlmProvider {
  return new OpenAiCompatibleProvider(config);
}

export * from "./errors.js";
export * from "./types.js";
