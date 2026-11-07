import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn()
}));

vi.mock("@/features/auth/services/auth.service", () => ({
  authService: {
    login: mocks.login,
    register: mocks.register,
    me: mocks.me
  }
}));

const { RegisterForm } = await import(
  "@/features/auth/components/register-form"
);
const { renderWithProviders } = await import("@/test/render");
const { useAuthStore } = await import("@/stores/auth.store");

const user = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

async function fillForm(
  testUser: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<"name" | "email" | "password" | "confirm", string>> = {}
): Promise<void> {
  const values = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "supersecret123",
    confirm: "supersecret123",
    ...overrides
  };

  await testUser.type(screen.getByLabelText(/^name/i), values.name);
  await testUser.type(screen.getByLabelText(/^email/i), values.email);
  await testUser.type(screen.getByLabelText(/^password/i), values.password);
  await testUser.type(screen.getByLabelText(/^confirm password/i), values.confirm);
}

describe("RegisterForm", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      status: "unauthenticated"
    });
  });

  it("requires a password of at least 8 characters", async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillForm(testUser, { password: "short", confirm: "short" });
    await testUser.click(
      screen.getByRole("button", { name: "Create account" })
    );

    expect(
      await screen.findByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("reports a mismatch between password and confirmation", async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillForm(testUser, { confirm: "differentpass123" });
    await testUser.click(
      screen.getByRole("button", { name: "Create account" })
    );

    expect(
      await screen.findByText("Passwords do not match")
    ).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("submits without the confirmation field and stores the session", async () => {
    mocks.register.mockResolvedValue({ token: "signed.jwt.token", user });
    const testUser = userEvent.setup();
    renderWithProviders(<RegisterForm />);

    await fillForm(testUser);
    await testUser.click(
      screen.getByRole("button", { name: "Create account" })
    );

    expect(mocks.register).toHaveBeenCalled();
    expect(mocks.register.mock.calls[0]?.[0]).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "supersecret123"
    });

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe("authenticated");
    });
  });
});
