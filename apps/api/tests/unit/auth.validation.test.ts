import { describe, expect, it } from "vitest";

import {
  loginSchema,
  registerSchema
} from "../../src/modules/auth/auth.schema.js";

const validRegistration = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "supersecret123"
};

describe("registration validation", () => {
  it("accepts a valid payload", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, email: "not-an-email" })
        .success
    ).toBe(false);
  });

  it("rejects a password shorter than eight characters", () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, password: "short" })
        .success
    ).toBe(false);
  });

  it("rejects a name shorter than two characters", () => {
    expect(
      registerSchema.safeParse({ ...validRegistration, name: "A" }).success
    ).toBe(false);
  });

  it("normalises the email to lowercase", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      email: "ADA@Example.com"
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.email).toBe("ada@example.com");
  });
});

describe("login validation", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "ada@example.com",
        password: "supersecret123"
      }).success
    ).toBe(true);
  });

  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "ada@example.com" }).success).toBe(
      false
    );
  });

  it("rejects an invalid email address", () => {
    expect(
      loginSchema.safeParse({ email: "bad", password: "supersecret123" }).success
    ).toBe(false);
  });
});
