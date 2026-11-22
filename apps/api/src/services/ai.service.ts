import type {
  DependencySummary,
  LanguageSummary,
  LlmProvider
} from "@codesense/shared";

import { createLlmProvider, LLM_PROVIDERS } from "./llm/index.js";

const MAX_SOURCE_CHARS = 6000;

export interface CodebaseSummaryInput {
  repositoryName: string;
  branch: string;
  files: number;
  linesOfCode: number;
  languages: LanguageSummary[];
  dependencies: DependencySummary[];
  source?: string;
}

export interface SummarizeCodebaseInput extends CodebaseSummaryInput {
  provider: LlmProvider;
  modelId: string;
  apiKey: string;
}

export interface GenerateTextInput {
  provider: LlmProvider;
  modelId: string;
  apiKey: string;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export function buildPrompt(input: CodebaseSummaryInput): string {
  const languages = input.languages
    .slice(0, 15)
    .map(
      (language) =>
        `${language.name} (${language.files} files, ${language.lines} lines)`
    )
    .join(", ");

  const dependencies = input.dependencies
    .slice(0, 50)
    .map((dependency) =>
      dependency.version
        ? `${dependency.ecosystem}:${dependency.name}@${dependency.version}`
        : `${dependency.ecosystem}:${dependency.name}`
    )
    .join(", ");

  const source = input.source?.trim();

  return [
    `Repository: ${input.repositoryName}`,
    `Branch: ${input.branch}`,
    `Files: ${input.files}`,
    `Lines of code: ${input.linesOfCode}`,
    `Languages: ${languages || "unknown"}`,
    `Dependencies: ${dependencies || "none detected"}`,
    ...(source
      ? [`Source excerpts:\n${source.slice(0, MAX_SOURCE_CHARS)}`]
      : [])
  ].join("\n");
}

export async function generateText(
  input: GenerateTextInput
): Promise<string> {
  const descriptor = LLM_PROVIDERS[input.provider];
  const provider = createLlmProvider({
    id: input.provider,
    baseUrl: descriptor.baseUrl,
    apiKey: input.apiKey,
    extraHeaders: descriptor.extraHeaders
  });

  const result = await provider.complete({
    model: input.modelId,
    system: input.system,
    user: input.user,
    maxTokens: input.maxTokens ?? 800,
    temperature: input.temperature ?? 0.3
  });

  return result.text;
}

export async function summarizeCodebase(
  input: SummarizeCodebaseInput
): Promise<string> {
  return generateText({
    provider: input.provider,
    modelId: input.modelId,
    apiKey: input.apiKey,
    system:
      "You are a code intelligence assistant. Given a summary of a codebase and representative source excerpts, produce a concise architecture overview covering what is implemented, structure, notable technologies, future scope, and any risks or observations.",
    user: buildPrompt(input)
  });
}
