import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

const app = createApp();

describe("GET /health", () => {
  it("reports the application as running when the database is unavailable", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.application).toBe("running");
    expect(response.body.data.environment).toBe("test");
    expect(response.body.data.database).toBe("disconnected");
    expect(response.body.data.status).toBe("degraded");
    expect(typeof response.body.data.timestamp).toBe("string");
  });
});

describe("unknown routes", () => {
  it("returns a structured 404 response", async () => {
    const response = await request(app).get("/api/v1/unknown-route");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
