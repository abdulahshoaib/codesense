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
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const User: Model<UserDocument> = model<UserDocument>("User", userSchema);
