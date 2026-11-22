import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { mountMcp } from "./mcp/http.js";
import healthRoutes from "./routes/health.routes.js";
import { apiRouter } from "./routes/index.js";

const BODY_LIMIT = "1mb";
const GITHUB_WEBHOOK_PATH = "/api/v1/github/webhook";

function resolveCorsOrigin(): boolean | string[] {
  if (env.CORS_ORIGIN === "*") {
    return true;
  }

  return env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
}

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");

  const jsonParser = express.json({ limit: BODY_LIMIT });
  const webhookParser = express.raw({ type: () => true, limit: BODY_LIMIT });

  app.use(helmet());
  app.use(cors({ origin: resolveCorsOrigin(), credentials: true }));
  app.use((req, res, next) => {
    const path = req.originalUrl.split("?")[0];

    if (path === GITHUB_WEBHOOK_PATH) {
      webhookParser(req, res, next);
      return;
    }

    jsonParser(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: BODY_LIMIT }));
  app.use(pinoHttp({ logger }));

  app.use("/health", healthRoutes);
  app.use("/api/v1", apiRouter);
  mountMcp(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
