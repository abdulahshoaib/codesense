import { loginSchema, registerSchema } from "@codesense/shared";
import { z } from "zod";

export const loginFormSchema = loginSchema;
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = registerSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
