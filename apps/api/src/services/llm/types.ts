export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
}

export interface LlmCompleteInput {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  signal?: AbortSignal;
}

export interface LlmCompleteResult {
  text: string;
  usage?: LlmUsage;
}

export interface LlmProviderConfig {
  id: string;
  baseUrl: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}

export interface LlmProvider {
  complete(input: LlmCompleteInput): Promise<LlmCompleteResult>;
}
