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

const { LoginForm } = await import(
  "@/features/auth/components/login-form"
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

describe("LoginForm", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      status: "unauthenticated"
    });
  });

  it("shows validation errors and does not submit when fields are empty", async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await testUser.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Password is required")).toBeInTheDocument();
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("shows an error for an invalid email address", async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await testUser.type(screen.getByLabelText(/email/i), "not-an-email");
    await testUser.type(screen.getByLabelText(/^password/i), "supersecret123");
    await testUser.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText(/invalid email/i)).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("submits valid credentials and stores the session", async () => {
    mocks.login.mockResolvedValue({ token: "signed.jwt.token", user });
    const testUser = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await testUser.type(screen.getByLabelText(/email/i), "ada@example.com");
    await testUser.type(screen.getByLabelText(/^password/i), "supersecret123");
    await testUser.click(screen.getByRole("button", { name: "Sign in" }));

    expect(mocks.login).toHaveBeenCalled();
    expect(mocks.login.mock.calls[0]?.[0]).toEqual({
      email: "ada@example.com",
      password: "supersecret123"
    });

    await vi.waitFor(() => {
      expect(useAuthStore.getState().status).toBe("authenticated");
    });
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it("renders API errors returned by the service", async () => {
    const { ApiClientError } = await import("@/lib/api-client");
    mocks.login.mockRejectedValue(
      new ApiClientError("Invalid email or password", {
        status: 401,
        code: "INVALID_CREDENTIALS"
      })
    );
    const testUser = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await testUser.type(screen.getByLabelText(/email/i), "ada@example.com");
    await testUser.type(screen.getByLabelText(/^password/i), "wrongpassword");
    await testUser.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid email or password")
    ).toBeInTheDocument();
  });
});
