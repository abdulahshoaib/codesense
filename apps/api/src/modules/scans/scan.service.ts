import type { ScanDTO } from "@codesense/shared";
import { Types } from "mongoose";

import { ApiError } from "../../utils/ApiError.js";
import { repositoryService } from "../repositories/repository.service.js";
import { Scan } from "./scan.model.js";
import { toScanDTO, type CreateScanData } from "./scan.types.js";

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

async function createScan(
  ownerId: string,
  repositoryId: string,
  data: CreateScanData
): Promise<ScanDTO> {
  await repositoryService.getOwnedRepository(ownerId, repositoryId);

  const scan = await Scan.create({
    repositoryId: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId),
    branch: data.branch,
    ...(data.commitHash !== undefined ? { commitHash: data.commitHash } : {}),
    status: "queued"
  });

  return toScanDTO(scan);
}

async function listScansForRepository(
  ownerId: string,
  repositoryId: string
): Promise<ScanDTO[]> {
  await repositoryService.getOwnedRepository(ownerId, repositoryId);

  const scans = await Scan.find({
    repositoryId: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId)
  })
    .sort({ createdAt: -1 })
    .exec();

  return scans.map(toScanDTO);
}

async function getScan(ownerId: string, scanId: string): Promise<ScanDTO> {
  const scan = await Scan.findOne({
    _id: toObjectId(scanId),
    ownerId: toObjectId(ownerId)
  }).exec();

  if (!scan) {
    throw ApiError.notFound("Scan not found", "SCAN_NOT_FOUND");
  }

  return toScanDTO(scan);
}

export const scanService = {
  createScan,
  listScansForRepository,
  getScan
};
