import { Router } from "express";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { Repository } from "../repositories/repository.model.js";
import { scanService } from "../scans/scan.service.js";
import { verifyGithubWebhookSignature } from "./github.service.js";
import type { GithubWebhookPushPayload } from "./github.types.js";

export const githubWebhookRoutes = Router();

githubWebhookRoutes.post("/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const rawBody = req.body;

  if (typeof signature !== "string" || !Buffer.isBuffer(rawBody)) {
    res.sendStatus(400);
    return;
  }

  if (
    !verifyGithubWebhookSignature(rawBody, signature, env.GITHUB_WEBHOOK_SECRET)
  ) {
    res.sendStatus(401);
    return;
  }

  let payload: GithubWebhookPushPayload;

  try {
    payload = JSON.parse(rawBody.toString("utf8")) as GithubWebhookPushPayload;
  } catch {
    res.sendStatus(400);
    return;
  }

  const ref = payload.ref ?? "";
  const fullName = payload.repository?.full_name;

  if (!ref.startsWith("refs/heads/") || !fullName) {
    res.sendStatus(200);
    return;
  }

  const branch = ref.slice("refs/heads/".length);
  const repositories = await Repository.find({
    provider: "github",
    defaultBranch: branch,
    $or: [
      { githubFullName: fullName },
      { url: `https://github.com/${fullName}` },
      { url: `https://github.com/${fullName}.git` }
    ]
  }).exec();

  if (repositories.length === 0) {
    res.sendStatus(200);
    return;
  }

  for (const repository of repositories) {
    void scanService
      .createScan(repository.ownerId.toString(), repository._id.toString(), {
        branch
      })
      .catch((error) => {
        logger.error(
          { error, repositoryId: repository._id.toString() },
          "Webhook-triggered scan failed"
        );
      });
  }

  res.status(202).json({ ok: true });
});
