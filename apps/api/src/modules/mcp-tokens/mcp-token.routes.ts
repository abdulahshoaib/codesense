import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { mcpTokenController } from "./mcp-token.controller.js";
import {
  createMcpTokenSchema,
  mcpTokenIdParamSchema
} from "./mcp-token.schema.js";

const router = Router();

router.use(authenticate);

router.get("/", mcpTokenController.getAccess);
router.post(
  "/tokens",
  validate({ body: createMcpTokenSchema }),
  mcpTokenController.create
);
router.delete(
  "/tokens/:id",
  validate({ params: mcpTokenIdParamSchema }),
  mcpTokenController.revoke
);

export default router;
