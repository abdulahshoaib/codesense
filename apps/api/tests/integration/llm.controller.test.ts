import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getModels: vi.fn(),
  updatePreference: vi.fn(),
  setKey: vi.fn(),
  deleteKey: vi.fn()
}));

vi.mock("../../src/modules/llm/llm.service.js", () => ({
  llmService: {
    getModels: mocks.getModels,
    updatePreference: mocks.updatePreference,
    setKey: mocks.setKey,
    deleteKey: mocks.deleteKey
  }
}));

const { createApp } = await import("../../src/app.js");
const { signAccessToken } = await import(
  "../../src/services/token.service.js"
);

const app = createApp();
const userId = "507f1f77bcf86cd799439011";
const token = signAccessToken({
  sub: userId,
  email: "ada@example.com"
});

const safeUser = {
  id: userId,
  name: "Ada Lovelace",
  email: "ada@example.com",
  github: null,
  llmKeys: { groq: true, openrouter: false },
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("llm controller", () => {
  beforeEach(() => {
    mocks.getModels.mockReset();
    mocks.updatePreference.mockReset();
    mocks.setKey.mockReset();
    mocks.deleteKey.mockReset();
  });

  it("returns models with availability", async () => {
    mocks.getModels.mockResolvedValue({
      models: [
        {
          provider: "groq",
          modelId: "openai/gpt-oss-120b",
          label: "OpenAI GPT-OSS 120B",
          free: true,
          default: true
        }
      ],
      availableProviders: ["groq"],
      preference: null
    });

    const response = await request(app)
      .get("/api/v1/llm/models")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.models).toHaveLength(1);
    expect(response.body.data.availableProviders).toEqual(["groq"]);
  });

  it("rejects an unknown model preference before the service runs", async () => {
    const response = await request(app)
      .patch("/api/v1/users/me/llm")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "groq",
        modelId: "unknown-model",
        fallbackEnabled: true
      });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.updatePreference).not.toHaveBeenCalled();
  });

  it("delegates preference updates to the service", async () => {
    mocks.updatePreference.mockResolvedValue(safeUser);

    const response = await request(app)
      .patch("/api/v1/users/me/llm")
      .set("Authorization", `Bearer ${token}`)
      .send({
        provider: "groq",
        modelId: "openai/gpt-oss-120b",
        fallbackEnabled: true
      });

    expect(response.status).toBe(200);
    expect(mocks.updatePreference).toHaveBeenCalledWith(userId, {
      provider: "groq",
      modelId: "openai/gpt-oss-120b",
      fallbackEnabled: true
    });
  });

  it("saves a key without ever returning it", async () => {
    mocks.setKey.mockResolvedValue(safeUser);

    const response = await request(app)
      .put("/api/v1/users/me/llm/keys/groq")
      .set("Authorization", `Bearer ${token}`)
      .send({ apiKey: "super-secret-value" });

    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain("super-secret-value");
    expect(mocks.setKey).toHaveBeenCalledWith(
      userId,
      "groq",
      "super-secret-value"
    );
  });

  it("clears a key", async () => {
    mocks.deleteKey.mockResolvedValue(safeUser);

    const response = await request(app)
      .delete("/api/v1/users/me/llm/keys/groq")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(mocks.deleteKey).toHaveBeenCalledWith(userId, "groq");
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/llm/models");

    expect(response.status).toBe(401);
  });
});
