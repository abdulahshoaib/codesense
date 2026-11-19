import { createScanSchema } from "@codesense/shared";
import { z } from "zod";

export const scanFormSchema = z.object({
  branch: createScanSchema.shape.branch
});

export type ScanFormValues = z.infer<typeof scanFormSchema>;
