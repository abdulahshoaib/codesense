import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StartScanDialog } from "@/features/scans/components/start-scan-dialog";
import { renderWithProviders } from "@/test/render";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  navigate: vi.fn()
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@/features/scans/hooks/use-scans", () => ({
  useCreateScan: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
    isError: false,
    error: null
  })
}));

vi.mock("@/features/repositories/hooks/use-repositories", () => ({
  useBranches: () => ({
    data: [
      { name: "main", commitHash: "aaa111" },
      { name: "develop", commitHash: "bbb222" }
    ],
    isLoading: false,
    isError: false,
    error: null
  })
}));

vi.mock("@/features/settings/hooks/use-llm", () => ({
  useLlmModels: () => ({
    data: {
      models: [
        {
          provider: "groq",
          modelId: "openai/gpt-oss-120b",
          label: "OpenAI GPT-OSS 120B",
          free: true,
          default: true
        },
        {
          provider: "openrouter",
          modelId: "openai/gpt-oss-120b:free",
          label: "OpenAI GPT-OSS 120B (Free)",
          free: true
        }
      ],
      availableProviders: ["groq"],
      preference: {
        provider: "groq",
        modelId: "openai/gpt-oss-120b",
        fallbackEnabled: false
      }
    },
    isLoading: false,
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
  it("selects a branch and navigates to the new scan", async () => {
    mocks.mutateAsync.mockResolvedValue({
      id: "507f1f77bcf86cd799439014"
    });
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

    const branchSelect = screen.getByLabelText(/branch/i);
    expect(branchSelect).toHaveValue("main");

    await testUser.selectOptions(branchSelect, "develop");
    await testUser.click(screen.getByRole("button", { name: "Create scan" }));

    await vi.waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalled());
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      repositoryId: repository.id,
      input: {
        branch: "develop",
        llm: { provider: "groq", modelId: "openai/gpt-oss-120b" }
      }
    });
    expect(mocks.navigate).toHaveBeenCalledWith(
      "/scans/507f1f77bcf86cd799439014"
    );
  });

  it("defaults the AI model select to the user preference", () => {
    renderWithProviders(
      <StartScanDialog
        open
        onClose={() => undefined}
        repositories={[repository]}
        fixedRepositoryId={repository.id}
        defaultBranch="main"
      />
    );

    expect(screen.getByLabelText(/AI model/i)).toHaveValue(
      "groq:openai/gpt-oss-120b"
    );
  });
});
