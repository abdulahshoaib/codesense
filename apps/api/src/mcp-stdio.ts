import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { connectDatabase } from "./config/database.js";
import { logger } from "./config/logger.js";
import { createCodeSenseMcpServer } from "./mcp/server.js";
import { mcpTokenService } from "./modules/mcp-tokens/mcp-token.service.js";

async function start(): Promise<void> {
  const token = process.env.CODESENSE_MCP_TOKEN?.trim();

  if (!token) {
    logger.error("CODESENSE_MCP_TOKEN is required for stdio MCP");
    process.exit(1);
  }

  await connectDatabase();

  const session = await mcpTokenService.authenticate(token);

  if (!session) {
    logger.error("Invalid or revoked MCP token");
    process.exit(1);
  }

  const server = createCodeSenseMcpServer(session.userId);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

start().catch((error: unknown) => {
  logger.error({ error }, "Failed to start MCP stdio server");
  process.exit(1);
});
