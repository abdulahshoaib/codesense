import type { LoginInput, RegisterInput } from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { userService } from "../users/user.service.js";
import { authService } from "./auth.service.js";

const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body as RegisterInput);
  res
    .status(201)
    .json(successResponse(result, "Account created successfully"));
});

const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body as LoginInput);
  res.status(200).json(successResponse(result, "Login successful"));
});

const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.user!.id);
  res.status(200).json(successResponse(user, "Authenticated user"));
});

export const authController = {
  register,
  login,
  me
};
