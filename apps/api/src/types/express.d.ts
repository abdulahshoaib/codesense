import type { AuthenticatedUser } from "../modules/users/user.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
