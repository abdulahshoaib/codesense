import { createServer } from "node:http";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticate: vi.fn(),
  listRepositories: vi.fn(),
  listLatestByRepository: vi.fn()
}));

vi.mock("../../src/modules/mcp-tokens/mcp-token.service.js", () => ({
  mcpTokenService: {
    authenticate: mocks.authenticate
  }
}));

vi.mock("../../src/modules/repositories/repository.service.js", () => ({
  repositoryService: {
    listRepositories: mocks.listRepositories
  }
}));

vi.mock("../../src/modules/scans/scan.service.js", () => ({
  scanService: {
    listLatestByRepository: mocks.listLatestByRepository
  }
}));

const { createApp } = await import("../../src/app.js");

const userId = "507f1f77bcf86cd799439011";
const repositoryId = "507f1f77bcf86cd799439012";

async function listen(
  app: ReturnType<typeof createApp>
): Promise<{ url: string; close: () => Promise<void> }> {
  const server = createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind MCP test server");
  }

  return {
    url: `http://127.0.0.1:${address.port}/mcp`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  };
}

describe("mcp http endpoint", () => {
  let close: (() => Promise<void>) | undefined;
  let client: Client | undefined;

  afterEach(async () => {
    if (client) {
      await client.close().catch(() => undefined);
      client = undefined;
    }
    if (close) {
      await close();
      close = undefined;
    }
  });

  it("rejects requests without an MCP token", async () => {
    const app = createApp();
    const listening = await listen(app);
    close = listening.close;

    const response = await fetch(listening.url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" }
        }
      })
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("MCP_AUTH_REQUIRED");
  });

  it("rejects a revoked token", async () => {
    mocks.authenticate.mockResolvedValue(null);
    const app = createApp();
    const listening = await listen(app);
    close = listening.close;

    const response = await fetch(listening.url, {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        Authorization: "Bearer cs_revoked",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test", version: "0.0.0" }
        }
      })
    });

    expect(response.status).toBe(401);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("MCP_TOKEN_INVALID");
  });

  it("connects an MCP client, lists tools, and calls list_repositories", async () => {
    mocks.authenticate.mockResolvedValue({
      id: "token-1",
      userId,
      email: "ada@example.com",
      name: "laptop"
    });
    mocks.listRepositories.mockResolvedValue([
      {
        id: repositoryId,
        name: "codesense",
        url: "https://github.com/ada/codesense",
        provider: "github",
        defaultBranch: "main"
      }
    ]);
    mocks.listLatestByRepository.mockResolvedValue(new Map());

    const app = createApp();
    const listening = await listen(app);
    close = listening.close;

    const transport = new StreamableHTTPClientTransport(new URL(listening.url), {
      requestInit: {
        headers: {
          Authorization: "Bearer cs_valid"
        }
      }
    });
    client = new Client({ name: "codesense-test", version: "0.0.0" });
    await client.connect(transport);

    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "list_repositories",
        "get_repository_overview",
        "get_file_tree",
        "read_file",
        "search_code",
        "list_branches",
        "list_commits",
        "list_scans",
        "get_scan",
        "trigger_scan",
        "get_project_info",
        "get_dependencies"
      ])
    );
    expect(names).toHaveLength(12);

    const result = await client.callTool({
      name: "list_repositories",
      arguments: {}
    });
    const content = result.content;
    expect(Array.isArray(content)).toBe(true);
    const first = Array.isArray(content) ? content[0] : undefined;
    expect(first).toMatchObject({ type: "text" });
    const text =
      first && typeof first === "object" && "text" in first
        ? String(first.text)
        : "";
    const parsed = JSON.parse(text) as {
      repositories: Array<{ id: string; name: string }>;
    };

    expect(result.isError).toBeFalsy();
    expect(parsed.repositories[0]?.id).toBe(repositoryId);
    expect(mocks.listRepositories).toHaveBeenCalledWith(userId);
    expect(mocks.authenticate).toHaveBeenCalledWith("cs_valid");
  });
});
