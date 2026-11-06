import type { ScanDTO, ScanStatus } from "@codesense/shared";
import type { Types } from "mongoose";

export interface ScanDocument {
  _id: Types.ObjectId;
  repositoryId: Types.ObjectId;
  ownerId: Types.ObjectId;
  branch: string;
  commitHash?: string;
  status: ScanStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateScanData {
  branch: string;
  commitHash?: string;
}

export function toScanDTO(scan: ScanDocument): ScanDTO {
  return {
    id: scan._id.toString(),
    repositoryId: scan.repositoryId.toString(),
    ownerId: scan.ownerId.toString(),
    branch: scan.branch,
    ...(scan.commitHash !== undefined ? { commitHash: scan.commitHash } : {}),
    status: scan.status,
    ...(scan.startedAt !== undefined
      ? { startedAt: scan.startedAt.toISOString() }
      : {}),
    ...(scan.completedAt !== undefined
      ? { completedAt: scan.completedAt.toISOString() }
      : {}),
    ...(scan.error !== undefined ? { error: scan.error } : {}),
    createdAt: scan.createdAt.toISOString(),
    updatedAt: scan.updatedAt.toISOString()
  };
}
