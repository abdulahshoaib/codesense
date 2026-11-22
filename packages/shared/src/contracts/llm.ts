export type LlmProvider = "groq" | "openrouter";

export interface LlmModel {
  provider: LlmProvider;
  modelId: string;
  label: string;
  free: true;
  default?: true;
}

export interface LlmSelection {
  provider: LlmProvider;
  modelId: string;
}

export interface LlmPreference {
  provider: LlmProvider;
  modelId: string;
  fallbackEnabled: boolean;
}

export interface LlmKeyStatus {
  groq: boolean;
  openrouter: boolean;
}

export interface LlmModelsResponse {
  models: LlmModel[];
  availableProviders: LlmProvider[];
  preference: LlmPreference | null;
}
