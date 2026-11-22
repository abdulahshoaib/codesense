import type { PublicUser, UpdateProfileInput } from "@codesense/shared";

import { ApiError } from "../../utils/ApiError.js";
import { User } from "./user.model.js";
import {
  toPublicUser,
  type CreateUserInput,
  type UserDocument
} from "./user.types.js";

async function createUser(input: CreateUserInput): Promise<UserDocument> {
  return User.create({
    name: input.name,
    email: input.email.toLowerCase().trim(),
    passwordHash: input.passwordHash
  });
}

const LLM_KEYS_SELECT = "+llmKeys.groq +llmKeys.openrouter";

async function findByEmail(
  email: string,
  options: { withPassword?: boolean } = {}
): Promise<UserDocument | null> {
  const query = User.findOne({ email: email.toLowerCase().trim() });

  query.select(
    options.withPassword
      ? `+passwordHash ${LLM_KEYS_SELECT}`
      : LLM_KEYS_SELECT
  );

  return query.exec();
}

async function findById(id: string): Promise<UserDocument | null> {
  return User.findById(id).select(LLM_KEYS_SELECT).exec();
}

async function getById(id: string): Promise<PublicUser> {
  const user = await findById(id);

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

async function updateProfile(
  id: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  if (input.email !== undefined) {
    const existing = await findByEmail(input.email);

    if (existing && existing._id.toString() !== id) {
      throw ApiError.conflict(
        "An account with this email already exists",
        "EMAIL_IN_USE"
      );
    }
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: input },
    { new: true, runValidators: true }
  )
    .select(LLM_KEYS_SELECT)
    .exec();

  if (!user) {
    throw ApiError.notFound("User not found", "USER_NOT_FOUND");
  }

  return toPublicUser(user);
}

export const userService = {
  createUser,
  findByEmail,
  findById,
  getById,
  updateProfile
};
