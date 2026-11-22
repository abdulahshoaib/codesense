import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { LlmProvider } from "@codesense/shared";

import { logger } from "../../config/logger.js";
import {
  analyzeDirectory,
  collectRepresentativeSource
} from "../../services/analysis.service.js";
import { cloneBranch } from "../../services/git.service.js";
import {
  buildGithubCloneUrl,
  getGithubAccessToken
} from "../github/github.service.js";
import { llmService, type CodebaseSummaryResult } from "../llm/llm.service.js";
import { repositoryInsightService } from "../repositories/repository-insight.service.js";
import { Repository } from "../repositories/repository.model.js";
import { Scan } from "./scan.model.js";

function sanitize(message: string, secret?: string): string {
  if (!secret) {
    return message;
  }

  return message.split(secret).join("***");
}

async function markFailed(scanId: string, error: string): Promise<void> {
  await Scan.findByIdAndUpdate(scanId, {
    status: "failed",
    error,
    completedAt: new Date()
  }).exec();
}

export async function executeScan(scanId: string): Promise<void> {
  const scan = await Scan.findById(scanId).exec();
  if (!scan) {
    return;
  }

  const repository = await Repository.findOne({
    _id: scan.repositoryId,
    ownerId: scan.ownerId
  }).exec();

  if (!repository) {
    await markFailed(scanId, "Repository not found").catch(() => undefined);
    return;
  }

  await Scan.findByIdAndUpdate(scanId, {
    status: "running",
    startedAt: new Date()
  }).exec();

  let accessToken: string | undefined;

  try {
    let cloneUrl: string;

    if (repository.provider === "github") {
      accessToken = await getGithubAccessToken(scan.ownerId.toString());
      cloneUrl = buildGithubCloneUrl(repository.url, accessToken);
    } else {
      cloneUrl = repository.url;
    }

    const workDir = await mkdtemp(join(tmpdir(), "codesense-scan-"));

    try {
      const repoDir = join(workDir, "repo");
      const checkout = await cloneBranch(cloneUrl, scan.branch, repoDir);
      const summary = await analyzeDirectory(repoDir);
      const source = await collectRepresentativeSource(repoDir).catch(
        () => ""
      );

      let llm: CodebaseSummaryResult | null = null;

      try {
        llm = await llmService.summarizeCodebaseForScan(
          scan.ownerId.toString(),
          {
            provider: scan.llmProvider as LlmProvider | undefined,
            modelId: scan.llmModel
          },
          {
            repositoryName: repository.name,
            branch: scan.branch,
            files: summary.files,
            linesOfCode: summary.linesOfCode,
            languages: summary.languages,
            dependencies: summary.dependencies,
            source
          }
        );
      } catch (error) {
        logger.warn({ error, scanId }, "AI codebase summary skipped");
        llm = null;
      }

      if (llm?.aiSummary) {
        await repositoryInsightService
          .updateContext(repository, llm.aiSummary, checkout.commitHash)
          .catch((error) => {
            logger.warn({ error, scanId }, "Project context update failed");
          });
      }

      if (repository.provider === "github") {
        void repositoryInsightService
          .refreshGithubData(
            scan.ownerId.toString(),
            scan.repositoryId.toString()
          )
          .catch((error) => {
            logger.warn({ error, scanId }, "GitHub insight refresh failed");
          });
      }

      await Scan.findByIdAndUpdate(scanId, {
        status: "completed",
        commitHash: checkout.commitHash,
        committedAt: new Date(checkout.committedAt),
        summary,
        ...(llm?.aiSummary ? { aiSummary: llm.aiSummary } : {}),
        ...(llm
          ? {
              llmProvider: llm.provider,
              llmModel: llm.modelId,
              llmFallbackUsed: llm.fallbackUsed
            }
          : {}),
        ...(llm?.aiError ? { aiError: llm.aiError } : {}),
        completedAt: new Date()
      }).exec();
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scan failed";
    await markFailed(scanId, sanitize(message, accessToken)).catch(() => undefined);
    logger.error({ error, scanId }, "Scan execution failed");
  }
}
