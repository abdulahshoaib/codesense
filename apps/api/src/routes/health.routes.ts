import { Router } from "express";

import { env } from "../config/env.js";
import { getDatabaseState, isDatabaseConnected } from "../config/database.js";
import { successResponse } from "../utils/response.js";

const router = Router();

router.get("/", (_req, res) => {
  const connected = isDatabaseConnected();
  const database = getDatabaseState();

  res.status(200).json(
    successResponse(
      {
        status: connected ? "ok" : "degraded",
        application: "running",
        database,
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString()
      },
      connected
        ? "Service healthy"
        : "Service running, database unavailable"
    )
  );
});

export default router;
