import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StartScanDialog } from "@/features/scans/components/start-scan-dialog";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn()
}));

vi.mock("@/features/scans/hooks/use-scans", () => ({
  useCreateScan: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    isError: false,
    error: null
  })
}));

const repository = {
  id: "507f1f77bcf86cd799439012",
  ownerId: "507f1f77bcf86cd799439011",
  name: "codesense",
  url: "https://github.com/acme/codesense",
  provider: "github" as const,
  defaultBranch: "main",
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("StartScanDialog", () => {
  it("submits only the branch and omits the commit hash field", async () => {
    mocks.mutateAsync.mockResolvedValue({});
    const testUser = userEvent.setup();

    renderWithProviders(
      <StartScanDialog
        open
        onClose={() => undefined}
        repositories={[repository]}
        fixedRepositoryId={repository.id}
        defaultBranch="main"
      />
    );

    expect(screen.queryByLabelText(/commit hash/i)).not.toBeInTheDocument();

    const branchInput = screen.getByLabelText(/branch/i);
    await testUser.clear(branchInput);
    await testUser.type(branchInput, "develop");
    await testUser.click(screen.getByRole("button", { name: "Create scan" }));

    await vi.waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalled());
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      repositoryId: repository.id,
      input: { branch: "develop" }
    });
  });
});
