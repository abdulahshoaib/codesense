import type { Server } from "node:http";

import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<void> {
  await connectDatabase();
  logger.info("Database connection established");

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(
      `CodeSense API listening on port ${env.PORT} (${env.NODE_ENV})`
    );
  });

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info(`${signal} received, shutting down gracefully`);

    const forceExit = setTimeout(() => {
      logger.error("Shutdown timed out, forcing exit");
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    server.close(async () => {
      await disconnectDatabase();
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  const handleSignal = (signal: NodeJS.Signals) => () => {
    void shutdown(signal);
  };

  process.on("SIGINT", handleSignal("SIGINT"));
  process.on("SIGTERM", handleSignal("SIGTERM"));

  registerServerErrorHandlers(server);
}

function registerServerErrorHandlers(server: Server): void {
  server.on("error", (error) => {
    logger.error({ err: error }, "HTTP server error");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    logger.error({ err: error }, "Uncaught exception");
    process.exit(1);
  });
}

start().catch((error) => {
  logger.error({ err: error }, "Failed to start server");
  process.exit(1);
});
