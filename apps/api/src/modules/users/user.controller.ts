import type { UpdateProfileInput } from "@codesense/shared";
import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { userService } from "./user.service.js";

const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.user!.id);
  res.status(200).json(successResponse(user, "Current user profile"));
});

const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateProfile(
    req.user!.id,
    req.body as UpdateProfileInput
  );

  res.status(200).json(successResponse(user, "Profile updated"));
});

export const userController = {
  me,
  update,
};
