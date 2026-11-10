import { model, Schema, type Model } from "mongoose";

import type { UserDocument } from "./user.types.js";

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
      id: { type: Number, required: true },
      login: { type: String, required: true, trim: true },
      name: { type: String, default: null },
      avatarUrl: { type: String, default: null },
      accessToken: { type: String, required: true, select: false },
      connectedAt: { type: Date, required: true }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ "github.id": 1 }, { unique: true, sparse: true });

export const User: Model<UserDocument> = model<UserDocument>("User", userSchema);
