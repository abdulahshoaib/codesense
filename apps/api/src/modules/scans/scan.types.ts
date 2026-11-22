import type {
  DependencySummary,
  LanguageSummary,
  LlmProvider,
  ScanDTO,
  ScanStatus,
  ScanSummary
} from "@codesense/shared";
import type { Types } from "mongoose";

export interface ScanDocument {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  ownerId: Types.ObjectId;
  branch: string;
  commitHash?: string;
  committedAt?: Date;
  status: ScanStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  summary?: ScanSummary;
  aiSummary?: string;
  llmProvider?: string;
  llmModel?: string;
  llmFallbackUsed?: boolean;
  aiError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScanData {
  branch: string;
  llm?: { provider: LlmProvider; modelId: string };
}

export function toScanDTO(scan: ScanDocument): ScanDTO {
  return {
    id: scan._id.toString(),
    repositoryId: scan.repositoryId.toString(),
    ownerId: scan.ownerId.toString(),
    branch: scan.branch,
    ...(scan.commitHash !== undefined ? { commitHash: scan.commitHash } : {}),
    ...(scan.committedAt !== undefined
      ? { committedAt: scan.committedAt.toISOString() }
      : {}),
    status: scan.status,
    ...(scan.startedAt !== undefined
      ? { startedAt: scan.startedAt.toISOString() }
      : {}),
    ...(scan.completedAt !== undefined
      ? { completedAt: scan.completedAt.toISOString() }
      : {}),
    ...(scan.error !== undefined ? { error: scan.error } : {}),
    ...(scan.summary !== undefined
      ? {
          summary: {
            files: scan.summary.files,
            linesOfCode: scan.summary.linesOfCode,
            languages: scan.summary.languages.map((language: LanguageSummary) => ({
              name: language.name,
              files: language.files,
              lines: language.lines
            })),
            dependencies: scan.summary.dependencies.map(
              (dependency: DependencySummary) => ({
                ecosystem: dependency.ecosystem,
                name: dependency.name,
                ...(dependency.version !== undefined
                  ? { version: dependency.version }
                  : {})
              })
            )
          }
        }
      : {}),
    ...(scan.aiSummary !== undefined ? { aiSummary: scan.aiSummary } : {}),
    ...(scan.llmProvider !== undefined
      ? { llmProvider: scan.llmProvider }
      : {}),
    ...(scan.llmModel !== undefined ? { llmModel: scan.llmModel } : {}),
    ...(scan.llmFallbackUsed !== undefined
      ? { llmFallbackUsed: scan.llmFallbackUsed }
      : {}),
    ...(scan.aiError !== undefined ? { aiError: scan.aiError } : {}),
    createdAt: scan.createdAt.toISOString(),
    updatedAt: scan.updatedAt.toISOString()
  };
}
