import crypto from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { verifyGithubWebhookSignature } from "../../src/modules/github/github.service.js";

const app = createApp();

describe("GitHub webhook signature", () => {
  it("accepts a matching sha256 signature", () => {
    const body = Buffer.from('{"ok":true}');
    const signature = `sha256=${crypto
      .createHmac("sha256", "secret")
      .update(body)
      .digest("hex")}`;

    expect(verifyGithubWebhookSignature(body, signature, "secret")).toBe(true);
  });

  it("rejects a mismatched signature", () => {
    expect(
      verifyGithubWebhookSignature(Buffer.from("{}"), "sha256=00", "secret")
    ).toBe(false);
  });
});

describe("POST /api/v1/github/webhook", () => {
  it("keeps the raw body so the signature can be checked", async () => {
    const response = await request(app)
      .post("/api/v1/github/webhook")
      .set("Content-Type", "application/json")
      .set("x-hub-signature-256", "sha256=deadbeef")
      .send({ ref: "refs/heads/main" });

    expect(response.status).toBe(401);
  });
});
