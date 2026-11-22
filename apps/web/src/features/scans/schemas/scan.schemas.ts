import { createScanSchema, llmSelectionSchema } from "@codesense/shared";
import { z } from "zod";

export const scanFormSchema = z.object({
  branch: createScanSchema.shape.branch,
  llm: llmSelectionSchema.optional()
});

export type ScanFormValues = z.infer<typeof scanFormSchema>;
