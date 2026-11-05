import bcrypt from "bcrypt";
import type {
  AuthResponse,
  LoginInput,
  RegisterInput
} from "@codesense/shared";

import { signAccessToken } from "../../services/token.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { userService } from "../users/user.service.js";
import { toPublicUser, type UserDocument } from "../users/user.types.js";

const SALT_ROUNDS = 12;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

function buildAuthResponse(user: UserDocument): AuthResponse {
  return {
    token: signAccessToken({
      sub: user._id.toString(),
      email: user.email
    }),
    user: toPublicUser(user)
  };
}

async function register(input: RegisterInput): Promise<AuthResponse> {
  const existingUser = await userService.findByEmail(input.email);

  if (existingUser) {
    throw ApiError.conflict(
      "An account with this email already exists",
      "EMAIL_IN_USE"
    );
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await userService.createUser({
    name: input.name,
    email: input.email,
    passwordHash
  });

  return buildAuthResponse(user);
}

async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await userService.findByEmail(input.email, {
    withPassword: true
  });

  if (!user) {
    throw ApiError.unauthorized(INVALID_CREDENTIALS_MESSAGE, "INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw ApiError.unauthorized(INVALID_CREDENTIALS_MESSAGE, "INVALID_CREDENTIALS");
  }

  return buildAuthResponse(user);
}

export const authService = {
  register,
  login
};
