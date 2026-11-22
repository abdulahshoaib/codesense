import { model, Schema, type Model } from "mongoose";

import type { UserDocument } from "./user.types.js";

const githubSchema = new Schema(
  {
    id: { type: Number, required: true },
    login: { type: String, required: true, trim: true },
    name: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    accessToken: { type: String, required: true, select: false },
    connectedAt: { type: Date, required: true }
  },
  { _id: false }
);

const llmKeysSchema = new Schema(
  {
    groq: { type: String, select: false },
    openrouter: { type: String, select: false }
  },
  { _id: false }
);

const llmPreferenceSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["groq", "openrouter"],
      required: true
    },
    modelId: { type: String, required: true, trim: true },
    fallbackEnabled: { type: Boolean, required: true, default: false }
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    github: {
      type: githubSchema,
      required: false,
      default: undefined
    },
    llmKeys: {
      type: llmKeysSchema,
      required: false,
      default: undefined
    },
    llmPreference: {
      type: llmPreferenceSchema,
      required: false,
      default: undefined
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ "github.id": 1 }, { unique: true, sparse: true });

export const User: Model<UserDocument> = model<UserDocument>("User", userSchema);
