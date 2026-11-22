import { Router } from "express";

import authRoutes from "../modules/auth/auth.routes.js";
import githubRoutes from "../modules/github/github.routes.js";
import llmRoutes, {
  userLlmRoutes
} from "../modules/llm/llm.routes.js";
import repositoryRoutes from "../modules/repositories/repository.routes.js";
import scanRoutes, {
  scanRepositoryRoutes
} from "../modules/scans/scan.routes.js";
import userRoutes from "../modules/users/user.routes.js";
import { successResponse } from "../utils/response.js";

export const apiRouter = Router();

apiRouter.get("/", (_req, res) => {
  res.status(200).json(successResponse({ version: "v1" }, "CodeSense API v1"));
});

apiRouter.use("/auth/github", githubRoutes);
apiRouter.use("/auth", authRoutes);
apiRouter.use("/llm", llmRoutes);
apiRouter.use("/users/me/llm", userLlmRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/repositories", repositoryRoutes);
apiRouter.use("/repositories/:repositoryId/scans", scanRepositoryRoutes);
apiRouter.use("/scans", scanRoutes);
