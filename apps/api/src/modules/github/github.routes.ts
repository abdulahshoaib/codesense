import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { githubController } from "./github.controller.js";

const router = Router();

router.get("/", authenticate, githubController.authorize);
router.get("/callback", githubController.callback);
router.get("/repositories", authenticate, githubController.listRepositories);
router.delete("/", authenticate, githubController.disconnect);

export default router;
