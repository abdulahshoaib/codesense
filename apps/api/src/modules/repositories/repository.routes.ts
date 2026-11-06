import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { repositoryController } from "./repository.controller.js";
import {
  createRepositorySchema,
  repositoryIdParamSchema,
  updateRepositorySchema
} from "./repository.schema.js";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  validate({ body: createRepositorySchema }),
  repositoryController.create
);

router.get("/", repositoryController.list);

router.get(
  "/:id",
  validate({ params: repositoryIdParamSchema }),
  repositoryController.getOne
);

router.patch(
  "/:id",
  validate({ params: repositoryIdParamSchema, body: updateRepositorySchema }),
  repositoryController.update
);

router.delete(
  "/:id",
  validate({ params: repositoryIdParamSchema }),
  repositoryController.remove
);

export default router;
