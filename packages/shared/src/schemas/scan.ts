import { z } from "zod";

import { objectIdSchema } from "./common.js";

export const scanStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed"
]);

export const createScanSchema = z.object({
  branch: z.string().trim().min(1, "Branch is required").max(200),
  commitHash: z
    .string()
    .trim()
    .regex(/^[0-9a-fA-F]{7,40}$/, "Commit hash must be a valid git hash")
    .optional()
});

export const scanIdParamSchema = z.object({
  id: objectIdSchema
});

export const repositoryScansParamSchema = z.object({
  repositoryId: objectIdSchema
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
