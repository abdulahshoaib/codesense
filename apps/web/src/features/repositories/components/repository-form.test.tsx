import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RepositoryForm } from "@/features/repositories/components/repository-form";
import { renderWithProviders } from "@/test/render";

describe("RepositoryForm", () => {
  it("requires a name and a valid URL", async () => {
    const onSubmit = vi.fn();
    const testUser = userEvent.setup();
    renderWithProviders(
      <RepositoryForm
        submitLabel="Connect repository"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await testUser.click(
      screen.getByRole("button", { name: "Connect repository" })
    );

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(
      screen.getByText("Repository URL must be a valid URL")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed repository URL", async () => {
    const onSubmit = vi.fn();
    const testUser = userEvent.setup();
    renderWithProviders(
      <RepositoryForm
        submitLabel="Connect repository"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await testUser.type(screen.getByLabelText(/repository name/i), "codesense");
    await testUser.type(screen.getByLabelText(/repository url/i), "not-a-url");
    await testUser.click(
      screen.getByRole("button", { name: "Connect repository" })
    );

    expect(
      await screen.findByText("Repository URL must be a valid URL")
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits validated values", async () => {
    const onSubmit = vi.fn();
    const testUser = userEvent.setup();
    renderWithProviders(
      <RepositoryForm
        submitLabel="Connect repository"
        isSubmitting={false}
        onSubmit={onSubmit}
      />
    );

    await testUser.type(screen.getByLabelText(/repository name/i), "codesense");
    await testUser.type(
      screen.getByLabelText(/repository url/i),
      "https://github.com/org/repo"
    );
    await testUser.click(
      screen.getByRole("button", { name: "Connect repository" })
    );

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: "codesense",
        url: "https://github.com/org/repo",
        provider: "github",
        defaultBranch: "main"
      })
    );
  });
});
