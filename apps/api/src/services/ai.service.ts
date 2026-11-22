import type {
  DependencySummary,
  LanguageSummary,
  LlmProvider
} from "@codesense/shared";

import { createLlmProvider, LLM_PROVIDERS } from "./llm/index.js";

export interface CodebaseSummaryInput {
  repositoryName: string;
  branch: string;
  files: number;
  linesOfCode: number;
  languages: LanguageSummary[];
  dependencies: DependencySummary[];
}

export interface SummarizeCodebaseInput extends CodebaseSummaryInput {
  provider: LlmProvider;
  modelId: string;
  apiKey: string;
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

  return [
    `Repository: ${input.repositoryName}`,
    `Branch: ${input.branch}`,
    `Files: ${input.files}`,
    `Lines of code: ${input.linesOfCode}`,
    `Languages: ${languages || "unknown"}`,
    `Dependencies: ${dependencies || "none detected"}`
  ].join("\n");
}

export async function summarizeCodebase(
  input: SummarizeCodebaseInput
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
    system:
      "You are a code intelligence assistant. Given a summary of a codebase, produce a concise architecture overview covering purpose, structure, notable technologies, and any risks or observations.",
    user: buildPrompt(input),
    maxTokens: 800,
    temperature: 0.3
  });

  return result.text;
}
