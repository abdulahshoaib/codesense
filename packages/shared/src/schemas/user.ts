import { z } from "zod";

import { emailSchema } from "./common.js";

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be at most 100 characters")
      .optional(),
    email: emailSchema.optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    error: "At least one field must be provided"
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
