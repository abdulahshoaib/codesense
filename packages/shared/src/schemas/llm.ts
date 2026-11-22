import { z } from "zod";

import type { LlmModel, LlmProvider } from "../contracts/llm.js";

export const llmProviderSchema = z.enum(["groq", "openrouter"]);

export const llmModels: LlmModel[] = [
  {
    provider: "groq",
    modelId: "openai/gpt-oss-120b",
    label: "OpenAI GPT-OSS 120B",
    free: true,
    default: true
  },
  {
    provider: "groq",
    modelId: "openai/gpt-oss-20b",
    label: "OpenAI GPT-OSS 20B",
    free: true
  },
  {
    provider: "groq",
    modelId: "qwen/qwen3.8-27b",
    label: "Qwen3.8 27B",
    free: true
  },
  {
    provider: "openrouter",
    modelId: "openai/gpt-oss-120b:free",
    label: "OpenAI GPT-OSS 120B (Free)",
    free: true
  },
  {
    provider: "openrouter",
    modelId: "deepseek/deepseek-chat:free",
    label: "DeepSeek Chat (Free)",
    free: true
  },
  {
    provider: "openrouter",
    modelId: "qwen/qwen-2.5-coder-32b-instruct:free",
    label: "Qwen 2.5 Coder 32B (Free)",
    free: true
  },
  {
    provider: "openrouter",
    modelId: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B (Free)",
    free: true
  }
];

export function isKnownLlmModel(
  provider: LlmProvider,
  modelId: string
): boolean {
  return llmModels.some(
    (model) => model.provider === provider && model.modelId === modelId
  );
}

export function getDefaultLlmModel(): LlmModel {
  return (
    llmModels.find((model) => model.default === true) ?? llmModels[0]
  );
}

export function getProviderDefaultModel(provider: LlmProvider): LlmModel {
  return (
    llmModels.find((model) => model.provider === provider) ??
    getDefaultLlmModel()
  );
}

export function findLlmModel(
  provider: LlmProvider,
  modelId: string
): LlmModel | undefined {
  return llmModels.find(
    (model) => model.provider === provider && model.modelId === modelId
  );
}

export const llmSelectionSchema = z
  .object({
    provider: llmProviderSchema,
    modelId: z.string().trim().min(1, "Model is required")
  })
  .refine((value) => isKnownLlmModel(value.provider, value.modelId), {
    message: "Unknown model for provider",
    path: ["modelId"]
  });

export const updateLlmPreferenceSchema = z
  .object({
    provider: llmProviderSchema,
    modelId: z.string().trim().min(1, "Model is required"),
    fallbackEnabled: z.boolean()
  })
  .refine((value) => isKnownLlmModel(value.provider, value.modelId), {
    message: "Unknown model for provider",
    path: ["modelId"]
  });

export const setLlmKeySchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required").max(500)
});

export const llmProviderParamSchema = z.object({
  provider: llmProviderSchema
});

export type LlmSelectionInput = z.infer<typeof llmSelectionSchema>;
export type UpdateLlmPreferenceInput = z.infer<
  typeof updateLlmPreferenceSchema
>;
export type SetLlmKeyInput = z.infer<typeof setLlmKeySchema>;
