import { describe, expect, it } from "vitest";

import {
  buildMcpClientConfigs,
  buildMcpStdioConfig
} from "../src/contracts/mcp.js";
import { createMcpTokenSchema } from "../src/schemas/mcp.js";

describe("mcp token schema", () => {
  it("accepts a trimmed name", () => {
    expect(createMcpTokenSchema.parse({ name: "  laptop  " })).toEqual({
      name: "laptop"
    });
  });

  it("rejects an empty name", () => {
    const result = createMcpTokenSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 80 characters", () => {
    const result = createMcpTokenSchema.safeParse({ name: "x".repeat(81) });
    expect(result.success).toBe(false);
  });
});

describe("mcp client configs", () => {
  it("builds HTTP client configs around the endpoint and token", () => {
    const configs = buildMcpClientConfigs(
      "http://localhost:5000/mcp",
      "cs_testtoken"
    );

    expect(configs.cursor.mcpServers.codesense.url).toBe(
      "http://localhost:5000/mcp"
    );
    expect(configs.cursor.mcpServers.codesense.headers.Authorization).toBe(
      "Bearer cs_testtoken"
    );
    expect(configs.claudeDesktop.mcpServers.codesense).toEqual(
      configs.cursor.mcpServers.codesense
    );
    expect(configs.vscode.servers.codesense.type).toBe("http");
  });

  it("builds a stdio client config that injects the token", () => {
    const config = buildMcpStdioConfig("cs_testtoken");

    expect(config.env.CODESENSE_MCP_TOKEN).toBe("cs_testtoken");
    expect(config.args).toContain("mcp:stdio");
  });
});
