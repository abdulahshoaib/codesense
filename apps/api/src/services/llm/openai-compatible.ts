import {
  AuthError,
  BadResponseError,
  LlmError,
  ProviderUnavailableError,
  RateLimitError
} from "./errors.js";
import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProvider,
  LlmProviderConfig
} from "./types.js";

const TIMEOUT_MS = 60_000;

interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
    text?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

function parseRetryAfterSeconds(headers: Headers): number | undefined {
  const retryAfter = headers.get("retry-after");

  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10);
    if (Number.isFinite(seconds)) {
      return seconds;
    }

    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) {
      return Math.max(0, Math.ceil((date - Date.now()) / 1000));
    }
  }

  const reset = headers.get("x-ratelimit-reset");
  if (reset) {
    const epoch = Number.parseInt(reset, 10);
    if (Number.isFinite(epoch)) {
      return Math.max(0, epoch - Math.floor(Date.now() / 1000));
    }
  }

  return undefined;
}

export class OpenAiCompatibleProvider implements LlmProvider {
  private readonly config: LlmProviderConfig;

  constructor(config: LlmProviderConfig) {
    this.config = config;
  }

  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    if (input.signal) {
      if (input.signal.aborted) {
        controller.abort();
      } else {
        input.signal.addEventListener("abort", () => controller.abort(), {
          once: true
        });
      }
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
          ...this.config.extraHeaders
        },
        body: JSON.stringify({
          model: input.model,
          temperature: input.temperature,
          max_tokens: input.maxTokens,
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.user }
          ]
        }),
        signal: controller.signal
      });

      if (response.status === 429) {
        throw new RateLimitError(
          "Rate limit exceeded",
          parseRetryAfterSeconds(response.headers)
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new AuthError(`Authentication failed (${response.status})`);
      }

      if (response.status >= 500) {
        throw new ProviderUnavailableError(
          `Provider unavailable (${response.status})`
        );
      }

      if (!response.ok) {
        throw new ProviderUnavailableError(
          `Provider error (${response.status})`
        );
      }

      let data: ChatCompletionResponse;
      try {
        data = (await response.json()) as ChatCompletionResponse;
      } catch {
        throw new BadResponseError("Malformed response body");
      }

      const choice = data.choices?.[0];
      const text = choice?.message?.content ?? choice?.text;

      if (typeof text !== "string" || text.trim().length === 0) {
        throw new BadResponseError("Empty or malformed response");
      }

      return {
        text,
        ...(data.usage
          ? {
              usage: {
                ...(data.usage.prompt_tokens !== undefined
                  ? { promptTokens: data.usage.prompt_tokens }
                  : {}),
                ...(data.usage.completion_tokens !== undefined
                  ? { completionTokens: data.usage.completion_tokens }
                  : {})
              }
            }
          : {})
      };
    } catch (error) {
      if (error instanceof LlmError) {
        throw error;
      }

      if (
        controller.signal.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw new ProviderUnavailableError("Request timed out");
      }

      throw new ProviderUnavailableError("Network error");
    } finally {
      clearTimeout(timeout);
    }
  }
}
