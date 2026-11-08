import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { userController } from "./user.controller.js";
import { updateProfileSchema } from "./user.schema.js";

const router = Router();

router.use(authenticate);
router.get("/me", userController.me);
router.patch(
  "/me",
  validate({ body: updateProfileSchema }),
  userController.update
);

export default router;
