import { describe, expect, it } from "vitest";

import { parseEnv } from "../../src/config/env.js";

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
});
