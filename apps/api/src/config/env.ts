import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ quiet: true });

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN is required").default("1d"),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  GITHUB_REDIRECT_URI: z
    .string()
    .default("http://localhost:5000/api/v1/auth/github/callback"),
  GITHUB_API_URL: z.string().default("https://api.github.com"),
  WEB_APP_URL: z.string().default("http://localhost:5173"),
  GROQ_API_KEY: z.string().default(""),
  OPENROUTER_API_KEY: z.string().default(""),
  LLM_FALLBACK_ORDER: z.string().default("groq,openrouter")
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration -> ${issues}`);
  }

  return result.data;
}

export function warnDeprecatedAiEnv(
  source: NodeJS.ProcessEnv = process.env
): void {
  const legacyKeys = ["AI_API_KEY", "AI_BASE_URL", "AI_MODEL"] as const;

  if (legacyKeys.some((key) => source[key] !== undefined)) {
    console.warn(
      "AI_API_KEY, AI_BASE_URL and AI_MODEL are deprecated and ignored. " +
        "Use GROQ_API_KEY and OPENROUTER_API_KEY instead."
    );
  }
}

export const env: Env = parseEnv();
warnDeprecatedAiEnv();
