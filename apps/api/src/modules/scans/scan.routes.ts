import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { scanController } from "./scan.controller.js";
import {
  createScanSchema,
  repositoryScansParamSchema,
  scanIdParamSchema
} from "./scan.schema.js";

export const scanRepositoryRoutes = Router({ mergeParams: true });

scanRepositoryRoutes.use(authenticate);

scanRepositoryRoutes.post(
  "/",
  validate({
    params: repositoryScansParamSchema,
    body: createScanSchema
  }),
  scanController.create
);

scanRepositoryRoutes.get(
  "/",
  validate({ params: repositoryScansParamSchema }),
  scanController.listForRepository
);

const scanRoutes = Router();

scanRoutes.use(authenticate);

scanRoutes.get(
  "/:id",
  validate({ params: scanIdParamSchema }),
  scanController.getOne
);

export default scanRoutes;
