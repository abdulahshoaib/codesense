import { createScanSchema } from "@codesense/shared";
import { z } from "zod";

const COMMIT_HASH_PATTERN = /^[0-9a-fA-F]{7,40}$/;

export const scanFormSchema = z.object({
  branch: createScanSchema.shape.branch,
  commitHash: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || COMMIT_HASH_PATTERN.test(value), {
      message: "Commit hash must be a valid git hash (7-40 hex characters)"
    })
});

export type ScanFormValues = z.infer<typeof scanFormSchema>;
