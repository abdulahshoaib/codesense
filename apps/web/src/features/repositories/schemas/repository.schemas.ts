import {
  repositoryProviderSchema,
  repositoryUrlSchema
} from "@codesense/shared";
import { z } from "zod";

export const repositoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  url: repositoryUrlSchema,
  provider: repositoryProviderSchema,
  defaultBranch: z
    .string()
    .trim()
    .min(1, "Default branch is required")
    .max(200, "Default branch must be at most 200 characters"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be at most 500 characters")
    .optional()
});

export type RepositoryFormValues = z.infer<typeof repositoryFormSchema>;

export const repositoryProviderOptions = repositoryProviderSchema.options.map(
  (value) => ({
    value,
    label: value === "github" ? "GitHub" : "Local"
  })
);
