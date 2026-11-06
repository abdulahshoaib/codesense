import type { CreateScanInput } from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { scanService } from "./scan.service.js";

const create = asyncHandler(async (req: Request, res: Response) => {
  const scan = await scanService.createScan(
    req.user!.id,
    req.params.repositoryId as string,
    req.body as CreateScanInput
  );

  res
    .status(201)
    .json(
      successResponse(
        scan,
        "Scan queued. Scan execution is not implemented yet."
      )
    );
});

const listForRepository = asyncHandler(async (req: Request, res: Response) => {
  const scans = await scanService.listScansForRepository(
    req.user!.id,
    req.params.repositoryId as string
  );

  res.status(200).json(successResponse(scans, "Scans retrieved"));
});

const getOne = asyncHandler(async (req: Request, res: Response) => {
  const scan = await scanService.getScan(req.user!.id, req.params.id as string);
  res.status(200).json(successResponse(scan, "Scan retrieved"));
});

export const scanController = {
  create,
  listForRepository,
  getOne
};
