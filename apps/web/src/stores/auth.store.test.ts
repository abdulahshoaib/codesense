import { beforeEach, describe, expect, it } from "vitest";

import { tokenStorage } from "@/lib/token-storage";
import { useAuthStore } from "@/stores/auth.store";

const user = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("auth store", () => {
  beforeEach(() => {
    tokenStorage.clear();
    useAuthStore.setState({
      user: null,
      token: null,
      status: "uninitialized"
    });
  });

  it("stores the session and marks the user as authenticated", () => {
    useAuthStore.getState().setSession("signed.jwt.token", user);

    const state = useAuthStore.getState();
    expect(state.status).toBe("authenticated");
    expect(state.token).toBe("signed.jwt.token");
    expect(state.user).toEqual(user);
    expect(tokenStorage.get()).toBe("signed.jwt.token");
  });

  it("clears the session and the stored token", () => {
    useAuthStore.getState().setSession("signed.jwt.token", user);

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.status).toBe("unauthenticated");
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(tokenStorage.get()).toBeNull();
  });

  it("persists the token to sessionStorage for refresh recovery", () => {
    useAuthStore.getState().setSession("signed.jwt.token", user);

    expect(window.sessionStorage.getItem("codesense.token")).toBe(
      "signed.jwt.token"
    );
  });
});
