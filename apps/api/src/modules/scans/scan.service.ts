import type { ScanDTO } from "@codesense/shared";
import { Types } from "mongoose";

import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/ApiError.js";
import { repositoryService } from "../repositories/repository.service.js";
import { executeScan } from "./scan.executor.js";
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
    status: "queued",
    ...(data.llm
      ? { llmProvider: data.llm.provider, llmModel: data.llm.modelId }
      : {})
  });

  const scanId = scan._id.toString();
  void executeScan(scanId).catch((error) => {
    logger.error({ error, scanId }, "Failed to start scan execution");
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

async function getLatestScanForRepository(
  ownerId: string,
  repositoryId: string
): Promise<ScanDTO | null> {
  const scan = await Scan.findOne({
    repositoryId: toObjectId(repositoryId),
    ownerId: toObjectId(ownerId)
  })
    .sort({ createdAt: -1 })
    .exec();

  return scan ? toScanDTO(scan) : null;
}

async function listLatestByRepository(
  ownerId: string
): Promise<Map<string, ScanDTO>> {
  const scans = await Scan.find({ ownerId: toObjectId(ownerId) })
    .sort({ createdAt: -1 })
    .exec();
  const latest = new Map<string, ScanDTO>();

  for (const scan of scans) {
    const key = scan.repositoryId.toString();
    if (!latest.has(key)) {
      latest.set(key, toScanDTO(scan));
    }
  }

  return latest;
}

export const scanService = {
  createScan,
  listScansForRepository,
  getScan,
  getLatestScanForRepository,
  listLatestByRepository
};
