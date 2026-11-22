import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  createToken: vi.fn(),
  revokeToken: vi.fn()
}));

vi.mock("../../src/modules/mcp-tokens/mcp-token.service.js", () => ({
  mcpTokenService: {
    getAccess: mocks.getAccess,
    createToken: mocks.createToken,
    revokeToken: mocks.revokeToken
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

describe("mcp token controller", () => {
  beforeEach(() => {
    mocks.getAccess.mockReset();
    mocks.createToken.mockReset();
    mocks.revokeToken.mockReset();
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/users/me/mcp");

    expect(response.status).toBe(401);
    expect(mocks.getAccess).not.toHaveBeenCalled();
  });

  it("returns MCP access details for the caller", async () => {
    mocks.getAccess.mockResolvedValue({
      endpoint: "http://localhost:5000/mcp",
      tokens: [],
      exampleConfigs: {
        cursor: { mcpServers: { codesense: { url: "http://localhost:5000/mcp", headers: { Authorization: "Bearer <token>" } } } }
      }
    });

    const response = await request(app)
      .get("/api/v1/users/me/mcp")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.endpoint).toBe("http://localhost:5000/mcp");
    expect(mocks.getAccess).toHaveBeenCalledWith(userId);
  });

  it("rejects an empty token name before the service runs", async () => {
    const response = await request(app)
      .post("/api/v1/users/me/mcp/tokens")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  " });

    expect(response.status).toBe(422);
    expect(mocks.createToken).not.toHaveBeenCalled();
  });

  it("creates a token for the authenticated user", async () => {
    mocks.createToken.mockResolvedValue({
      id: "507f1f77bcf86cd799439099",
      name: "laptop",
      prefix: "cs_abcdefghij",
      lastUsedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z",
      token: "cs_secret"
    });

    const response = await request(app)
      .post("/api/v1/users/me/mcp/tokens")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "laptop" });

    expect(response.status).toBe(201);
    expect(response.body.data.token).toBe("cs_secret");
    expect(mocks.createToken).toHaveBeenCalledWith(userId, { name: "laptop" });
  });

  it("revokes an owned token", async () => {
    mocks.revokeToken.mockResolvedValue(undefined);

    const response = await request(app)
      .delete("/api/v1/users/me/mcp/tokens/507f1f77bcf86cd799439099")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(mocks.revokeToken).toHaveBeenCalledWith(
      userId,
      "507f1f77bcf86cd799439099"
    );
  });
});
