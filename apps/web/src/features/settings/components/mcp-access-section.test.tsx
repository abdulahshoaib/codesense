import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccess: vi.fn(),
  createToken: vi.fn(),
  revokeToken: vi.fn()
}));

vi.mock("@/features/settings/services/mcp.service", () => ({
  mcpService: {
    getAccess: mocks.getAccess,
    createToken: mocks.createToken,
    revokeToken: mocks.revokeToken
  }
}));

const { McpAccessSection } = await import(
  "@/features/settings/components/mcp-access-section"
);
const { renderWithProviders } = await import("@/test/render");

const access = {
  endpoint: "http://localhost:5000/mcp",
  tokens: [
    {
      id: "507f1f77bcf86cd799439099",
      name: "laptop",
      prefix: "cs_abcdefghij",
      lastUsedAt: null,
      createdAt: "2026-11-01T00:00:00.000Z"
    }
  ],
  exampleConfigs: {
    cursor: {
      mcpServers: {
        codesense: {
          url: "http://localhost:5000/mcp",
          headers: { Authorization: "Bearer <token>" }
        }
      }
    },
    claudeDesktop: {
      mcpServers: {
        codesense: {
          url: "http://localhost:5000/mcp",
          headers: { Authorization: "Bearer <token>" }
        }
      }
    },
    vscode: {
      servers: {
        codesense: {
          type: "http",
          url: "http://localhost:5000/mcp",
          headers: { Authorization: "Bearer <token>" }
        }
      }
    }
  }
};

describe("McpAccessSection", () => {
  beforeEach(() => {
    mocks.getAccess.mockReset();
    mocks.createToken.mockReset();
    mocks.revokeToken.mockReset();
    mocks.getAccess.mockResolvedValue(access);
  });

  it("renders the endpoint, token list, and client configs", async () => {
    renderWithProviders(<McpAccessSection />, { route: "/settings" });

    expect(await screen.findByText("laptop")).toBeInTheDocument();
    expect(screen.getByText("MCP access")).toBeInTheDocument();
    expect(screen.getByText("http://localhost:5000/mcp")).toBeInTheDocument();
    expect(screen.getByText("cs_abcdefghij…")).toBeInTheDocument();
    expect(screen.getByText("Cursor mcp.json")).toBeInTheDocument();
    expect(screen.getByText("Claude Desktop")).toBeInTheDocument();
  });

  it("creates a token and shows it once", async () => {
    const user = userEvent.setup();
    mocks.createToken.mockResolvedValue({
      ...access.tokens[0],
      token: "cs_secret_once"
    });

    renderWithProviders(<McpAccessSection />, { route: "/settings" });
    await screen.findByText("laptop");

    await user.type(screen.getByLabelText("Token name"), "ci");
    await user.click(screen.getByRole("button", { name: "Create token" }));

    expect(await screen.findByText("Copy your MCP token")).toBeInTheDocument();
    expect(screen.getByDisplayValue("cs_secret_once")).toBeInTheDocument();
    expect(mocks.createToken.mock.calls[0]?.[0]).toEqual({ name: "ci" });
  });
});
