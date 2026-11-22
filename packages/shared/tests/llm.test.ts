import { describe, expect, it } from "vitest";

import {
  getDefaultLlmModel,
  getProviderDefaultModel,
  isKnownLlmModel,
  llmModels,
  llmProviderSchema,
  llmSelectionSchema
} from "../src/schemas/llm.js";

describe("llm model registry", () => {
  it("has exactly one default model", () => {
    const defaults = llmModels.filter((model) => model.default === true);
    expect(defaults).toHaveLength(1);
  });

  it("marks every model as free", () => {
    for (const model of llmModels) {
      expect(model.free).toBe(true);
    }
  });

  it("only contains groq and openrouter providers", () => {
    for (const model of llmModels) {
      expect(["groq", "openrouter"]).toContain(model.provider);
    }
  });

  it("returns the default model from the registry", () => {
    expect(getDefaultLlmModel().default).toBe(true);
  });

  it("returns a per-provider default model", () => {
    expect(getProviderDefaultModel("groq").provider).toBe("groq");
    expect(getProviderDefaultModel("openrouter").provider).toBe("openrouter");
  });

  it("recognizes known provider/model pairs", () => {
    expect(isKnownLlmModel("groq", "openai/gpt-oss-120b")).toBe(true);
    expect(isKnownLlmModel("openrouter", "openai/gpt-oss-120b:free")).toBe(true);
    expect(isKnownLlmModel("groq", "does-not-exist")).toBe(false);
  });
});

describe("llm schemas", () => {
  it("validates a known provider", () => {
    expect(llmProviderSchema.parse("groq")).toBe("groq");
    expect(() => llmProviderSchema.parse("gemini")).toThrow();
  });

  it("accepts a known provider/model selection", () => {
    expect(
      llmSelectionSchema.parse({
        provider: "groq",
        modelId: "openai/gpt-oss-120b"
      })
    ).toEqual({ provider: "groq", modelId: "openai/gpt-oss-120b" });
  });

  it("rejects an unknown model for a provider", () => {
    expect(() =>
      llmSelectionSchema.parse({ provider: "groq", modelId: "unknown" })
    ).toThrow();
  });

  it("rejects an unknown provider", () => {
    expect(() =>
      llmSelectionSchema.parse({ provider: "openai", modelId: "x" })
    ).toThrow();
  });
});
