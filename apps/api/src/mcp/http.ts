import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Express, NextFunction, Request, Response } from "express";

import { logger } from "../config/logger.js";
import { authenticateMcp } from "./auth.js";
import { createCodeSenseMcpServer } from "./server.js";

async function handleMcpRequest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;

  if (!userId) {
    next();
    return;
  }

  const server = createCodeSenseMcpServer(userId);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  const close = (): void => {
    void transport.close();
    void server.close();
  };

  res.on("close", close);

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error({ error }, "MCP request failed");
    close();
    if (!res.headersSent) {
      next(error);
    }
  }
}

export function mountMcp(app: Express): void {
  app.all("/mcp", authenticateMcp, (req, res, next) => {
    void handleMcpRequest(req, res, next);
  });
}
