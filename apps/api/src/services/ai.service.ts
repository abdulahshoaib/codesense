import type {
  DependencySummary,
  LanguageSummary
} from "@codesense/shared";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export interface CodebaseSummaryInput {
  repositoryName: string;
  branch: string;
  files: number;
  linesOfCode: number;
  languages: LanguageSummary[];
  dependencies: DependencySummary[];
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
}

function buildPrompt(input: CodebaseSummaryInput): string {
  const languages = input.languages
    .slice(0, 15)
    .map((language) => `${language.name} (${language.files} files, ${language.lines} lines)`)
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
  input: CodebaseSummaryInput
): Promise<string | null> {
  if (!env.AI_API_KEY) {
    return null;
  }

  const response = await fetch(`${env.AI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: env.AI_MODEL,
      temperature: 0.3,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content:
            "You are a code intelligence assistant. Given a summary of a codebase, produce a concise architecture overview covering purpose, structure, notable technologies, and any risks or observations."
        },
        {
          role: "user",
          content: buildPrompt(input)
        }
      ]
    })
  });

  if (!response.ok) {
    throw ApiError.internal(
      "AI codebase summary failed",
      "AI_SUMMARY_FAILED"
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const choice = data.choices?.[0];

  return choice?.message?.content ?? choice?.text ?? null;
}
