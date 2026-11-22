import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updatePreference: vi.fn(),
  setKey: vi.fn(),
  deleteKey: vi.fn()
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
      preference: null
    },
    isLoading: false,
    isError: false,
    error: null
  }),
  useUpdateLlmPreference: () => ({
    mutate: mocks.updatePreference,
    isPending: false,
    error: null
  }),
  useSetLlmKey: () => ({ mutate: mocks.setKey, isPending: false, error: null }),
  useDeleteLlmKey: () => ({
    mutate: mocks.deleteKey,
    isPending: false,
    error: null
  })
}));

const { AiModelSection } = await import(
  "@/features/settings/components/ai-model-section"
);
const { renderWithProviders } = await import("@/test/render");
const { useAuthStore } = await import("@/stores/auth.store");

const baseUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Ada Lovelace",
  email: "ada@example.com",
  github: null,
  llmKeys: { groq: false, openrouter: false },
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z"
};

describe("AiModelSection", () => {
  beforeEach(() => {
    mocks.updatePreference.mockReset();
    mocks.setKey.mockReset();
    mocks.deleteKey.mockReset();
    useAuthStore.setState({ user: null, token: null, status: "uninitialized" });
  });

  it("renders the model picker, Free badge and key states", () => {
    useAuthStore.setState({ user: baseUser, status: "authenticated" });
    renderWithProviders(<AiModelSection />, { route: "/settings" });

    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getAllByText("Not set")).toHaveLength(2);
    expect(screen.queryByText("Key set")).not.toBeInTheDocument();
  });

  it("shows a key as set when the user has one configured", () => {
    useAuthStore.setState({
      user: { ...baseUser, llmKeys: { groq: true, openrouter: false } },
      status: "authenticated"
    });
    renderWithProviders(<AiModelSection />, { route: "/settings" });

    expect(screen.getByText("Key set")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
  });

  it("saves a preference when a model is selected", async () => {
    useAuthStore.setState({ user: baseUser, status: "authenticated" });
    renderWithProviders(<AiModelSection />, { route: "/settings" });

    const testUser = userEvent.setup();
    await testUser.selectOptions(
      screen.getByLabelText(/model/i),
      "groq:openai/gpt-oss-120b"
    );
    await testUser.click(
      screen.getByRole("button", { name: "Save preference" })
    );

    expect(mocks.updatePreference).toHaveBeenCalledWith({
      provider: "groq",
      modelId: "openai/gpt-oss-120b",
      fallbackEnabled: false
    });
  });
});
