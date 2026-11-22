import { Router } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../../config/env.js";
import { authenticate } from "../../middleware/authenticate.js";
import { validate } from "../../middleware/validate.js";
import { authController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again later"
      }
    });
  }
});

router.post(
  "/register",
  authLimiter,
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  "/login",
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

router.get("/me", authenticate, authController.me);

export default router;
