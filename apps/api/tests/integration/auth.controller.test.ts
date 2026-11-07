import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn()
}));

vi.mock("../../src/modules/auth/auth.service.js", () => ({
  authService: {
    register: mocks.register,
    login: mocks.login
  }
}));

const { createApp } = await import("../../src/app.js");

const app = createApp();

const safeUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("auth controller", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.login.mockReset();
  });

  it("delegates registration to the auth service", async () => {
    mocks.register.mockResolvedValue({ token: "signed.jwt.token", user: safeUser });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Ada Lovelace",
        email: "ada@example.com",
        password: "supersecret123"
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe("signed.jwt.token");
    expect(mocks.register).toHaveBeenCalledWith({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "supersecret123"
    });
  });

  it("rejects invalid payloads before reaching the service", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "A", email: "invalid", password: "short" });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("returns a 401 error response from the service layer", async () => {
    const { ApiError } = await import("../../src/utils/ApiError.js");
    mocks.login.mockRejectedValue(
      ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS")
    );

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "ada@example.com", password: "supersecret123" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });
});
