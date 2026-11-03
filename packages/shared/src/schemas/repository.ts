import { z } from "zod";

import { objectIdSchema } from "./common.js";

export const repositoryProviderSchema = z.enum(["github", "local"]);

export const repositoryUrlSchema = z
  .url("Repository URL must be a valid URL")
  .max(2048);

export const createRepositorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  url: repositoryUrlSchema,
  provider: repositoryProviderSchema,
  defaultBranch: z.string().trim().min(1).max(200).default("main"),
  description: z.string().trim().max(500).optional()
});

export const updateRepositorySchema = createRepositorySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided"
  });

export const repositoryIdParamSchema = z.object({
  id: objectIdSchema
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
export type UpdateRepositoryInput = z.infer<typeof updateRepositorySchema>;
