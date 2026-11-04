import type { ZodError } from "zod";

export interface ValidationIssue {
  path: string;
  message: string;
}

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "root",
    message: issue.message
  }));
}
