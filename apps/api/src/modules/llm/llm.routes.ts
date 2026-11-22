import { Router } from "express";

import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { llmController } from "./llm.controller.js";
import {
  llmProviderParamSchema,
  setLlmKeySchema,
  updateLlmPreferenceSchema
} from "./llm.schema.js";

export const llmRoutes = Router();

llmRoutes.use(authenticate);
llmRoutes.get("/models", llmController.getModels);

export const userLlmRoutes = Router();

userLlmRoutes.use(authenticate);
userLlmRoutes.patch(
  "/",
  validate({ body: updateLlmPreferenceSchema }),
  llmController.updatePreference
);
userLlmRoutes.put(
  "/keys/:provider",
  validate({ params: llmProviderParamSchema, body: setLlmKeySchema }),
  llmController.setKey
);
userLlmRoutes.delete(
  "/keys/:provider",
  validate({ params: llmProviderParamSchema }),
  llmController.deleteKey
);

export default llmRoutes;
