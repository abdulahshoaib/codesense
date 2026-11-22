import { afterEach, describe, expect, it, vi } from "vitest";

import { parseEnv, warnDeprecatedAiEnv } from "../../src/config/env.js";

afterEach(() => {
  vi.restoreAllMocks();
});

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  PORT: "4000",
  MONGODB_URI: "mongodb://localhost:27017/codesense_test",
  JWT_SECRET: "test_jwt_secret_that_is_long_enough_to_pass_validation",
  JWT_EXPIRES_IN: "1h",
  CORS_ORIGIN: "http://localhost:5173",
  LOG_LEVEL: "info"
};

function without(env: NodeJS.ProcessEnv, keys: string[]): NodeJS.ProcessEnv {
  const clone = { ...env };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
}

describe("environment validation", () => {
  it("parses and coerces valid variables", () => {
    const env = parseEnv(baseEnv);

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("test");
    expect(env.JWT_EXPIRES_IN).toBe("1h");
  });

  it("applies defaults for optional variables", () => {
    const env = parseEnv(without(baseEnv, ["PORT", "NODE_ENV", "LOG_LEVEL"]));

    expect(env.PORT).toBe(5000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("fails fast when MONGODB_URI is missing", () => {
    expect(() => parseEnv(without(baseEnv, ["MONGODB_URI"]))).toThrow(
      /MONGODB_URI/
    );
  });

  it("rejects a JWT secret that is too short", () => {
    expect(() => parseEnv({ ...baseEnv, JWT_SECRET: "too-short" })).toThrow(
      /JWT_SECRET/
    );
  });

  it("rejects an unknown environment name", () => {
    expect(() => parseEnv({ ...baseEnv, NODE_ENV: "staging" })).toThrow(
      /NODE_ENV/
    );
  });

  it("applies defaults for the LLM provider variables", () => {
    const env = parseEnv(baseEnv);

    expect(env.GROQ_API_KEY).toBe("");
    expect(env.OPENROUTER_API_KEY).toBe("");
    expect(env.LLM_FALLBACK_ORDER).toBe("groq,openrouter");
    expect(env.MCP_PUBLIC_URL).toBe("");
  });

  it("warns once when legacy AI_* variables are present", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnDeprecatedAiEnv({ AI_API_KEY: "legacy" });

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("deprecated");
  });

  it("does not warn when legacy AI_* variables are absent", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    warnDeprecatedAiEnv({});

    expect(warn).not.toHaveBeenCalled();
  });

  it("rejects wildcard CORS_ORIGIN in production", () => {
    expect(() =>
      parseEnv({ ...baseEnv, NODE_ENV: "production", CORS_ORIGIN: "*" })
    ).toThrow(/CORS_ORIGIN cannot be \* in production/);
  });

  it("allows wildcard CORS_ORIGIN outside production", () => {
    const env = parseEnv({
      ...baseEnv,
      NODE_ENV: "development",
      CORS_ORIGIN: "*"
    });

    expect(env.CORS_ORIGIN).toBe("*");
  });
});
