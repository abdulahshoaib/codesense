import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/async-handler.js";
import { successResponse } from "../../utils/response.js";
import { userService } from "./user.service.js";

const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.user!.id);
  res.status(200).json(successResponse(user, "Current user profile"));
});

export const userController = {
  me
};
