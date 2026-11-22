import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerMcpTools } from "./tools.js";

export const MCP_SERVER_NAME = "codesense";
export const MCP_SERVER_VERSION = "0.1.0";

export function createCodeSenseMcpServer(userId: string): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION
  });

  registerMcpTools(server, userId);

  return server;
}
