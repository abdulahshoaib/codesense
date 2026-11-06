import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { userController } from "./user.controller.js";

const router = Router();

router.use(authenticate);
router.get("/me", userController.me);

export default router;
