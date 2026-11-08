import { emailSchema } from "@codesense/shared";
import { z } from "zod";

export const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: emailSchema
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
