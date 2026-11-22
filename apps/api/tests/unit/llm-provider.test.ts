import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AuthError,
  BadResponseError,
  ProviderUnavailableError,
  RateLimitError
} from "../../src/services/llm/errors.js";
import { OpenAiCompatibleProvider } from "../../src/services/llm/openai-compatible.js";

const config = {
  id: "groq",
  baseUrl: "https://api.groq.com/openai/v1",
  apiKey: "secret-key"
};

const input = {
  model: "openai/gpt-oss-120b",
  system: "system prompt",
  user: "user prompt",
  maxTokens: 800,
  temperature: 0.3
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("OpenAiCompatibleProvider", () => {
  it("returns text and usage on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: "summary" } }],
        usage: { prompt_tokens: 12, completion_tokens: 40 }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);
    const result = await provider.complete(input);

    expect(result.text).toBe("summary");
    expect(result.usage).toEqual({
      promptTokens: 12,
      completionTokens: 40
    });
  });

  it("maps 429 to RateLimitError with retry-after", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "30" })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);

    await expect(provider.complete(input)).rejects.toBeInstanceOf(RateLimitError);
    await expect(provider.complete(input)).rejects.toMatchObject({
      retryAfterSeconds: 30
    });
  });

  it("maps 401 to AuthError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers()
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);

    await expect(provider.complete(input)).rejects.toBeInstanceOf(AuthError);
  });

  it("maps 500 to ProviderUnavailableError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers()
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);

    await expect(provider.complete(input)).rejects.toBeInstanceOf(
      ProviderUnavailableError
    );
  });

  it("maps malformed JSON to BadResponseError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error("invalid json"))
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);

    await expect(provider.complete(input)).rejects.toBeInstanceOf(
      BadResponseError
    );
  });

  it("maps an empty body to BadResponseError", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ choices: [] })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);

    await expect(provider.complete(input)).rejects.toBeInstanceOf(
      BadResponseError
    );
  });

  it("maps a timeout to ProviderUnavailableError", async () => {
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        })
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAiCompatibleProvider(config);
    const promise = provider.complete(input);
    const assertion = expect(promise).rejects.toBeInstanceOf(
      ProviderUnavailableError
    );

    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });
});
