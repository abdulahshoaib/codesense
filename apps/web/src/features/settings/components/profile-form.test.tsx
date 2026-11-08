import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateProfile: vi.fn()
}));

vi.mock("@/features/settings/services/user.service", () => ({
  userService: {
    updateProfile: mocks.updateProfile
  }
}));

const { ProfileForm } = await import(
  "@/features/settings/components/profile-form"
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

describe("ProfileForm", () => {
  beforeEach(() => {
    mocks.updateProfile.mockReset();
    useAuthStore.setState({ user: null, token: null, status: "uninitialized" });
  });

  it("prefills the current profile and disables saving until a change is made", () => {
    renderWithProviders(<ProfileForm user={user} />);

    expect(screen.getByLabelText(/display name/i)).toHaveValue(user.name);
    expect(screen.getByLabelText(/email address/i)).toHaveValue(user.email);
    expect(
      screen.getByRole("button", { name: "Save changes" })
    ).toBeDisabled();
  });

  it("shows validation errors and does not submit invalid values", async () => {
    const testUser = userEvent.setup();
    renderWithProviders(<ProfileForm user={user} />);

    await testUser.clear(screen.getByLabelText(/display name/i));
    await testUser.type(screen.getByLabelText(/display name/i), "A");
    await testUser.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Name must be at least 2 characters")
    ).toBeInTheDocument();
    expect(mocks.updateProfile).not.toHaveBeenCalled();
  });

  it("submits changed values and updates the stored user", async () => {
    mocks.updateProfile.mockResolvedValue({
      ...user,
      name: "Ada Byron"
    });
    const testUser = userEvent.setup();
    renderWithProviders(<ProfileForm user={user} />);

    await testUser.clear(screen.getByLabelText(/display name/i));
    await testUser.type(screen.getByLabelText(/display name/i), "Ada Byron");
    await testUser.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => {
      expect(mocks.updateProfile).toHaveBeenCalledWith({
        name: "Ada Byron",
        email: user.email
      });
    });

    await vi.waitFor(() => {
      expect(useAuthStore.getState().user?.name).toBe("Ada Byron");
    });
  });

  it("renders API errors returned by the service", async () => {
    const { ApiClientError } = await import("@/lib/api-client");
    mocks.updateProfile.mockRejectedValue(
      new ApiClientError("An account with this email already exists", {
        status: 409,
        code: "EMAIL_IN_USE"
      })
    );
    const testUser = userEvent.setup();
    renderWithProviders(<ProfileForm user={user} />);

    await testUser.clear(screen.getByLabelText(/email address/i));
    await testUser.type(
      screen.getByLabelText(/email address/i),
      "taken@example.com"
    );
    await testUser.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("An account with this email already exists")
    ).toBeInTheDocument();
  });
});
