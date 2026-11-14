import { z } from "zod";

import { objectIdSchema } from "./common.js";

export const scanStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed"
]);

export const createScanSchema = z.object({
  branch: z.string().trim().min(1, "Branch is required").max(200)
});

export const scanIdParamSchema = z.object({
  id: objectIdSchema
});

export const repositoryScansParamSchema = z.object({
  repositoryId: objectIdSchema
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
