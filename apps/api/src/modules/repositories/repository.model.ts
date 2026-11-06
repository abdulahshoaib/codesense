import { model, Schema, type Model } from "mongoose";

import type { RepositoryDocument } from "./repository.types.js";

const repositorySchema = new Schema<RepositoryDocument>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048
    },
    provider: {
      type: String,
      enum: ["github", "local"],
      required: true
    },
    defaultBranch: {
      type: String,
      required: true,
      trim: true,
      default: "main"
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

repositorySchema.index({ ownerId: 1, createdAt: -1 });
repositorySchema.index({ ownerId: 1, url: 1 }, { unique: true });

export const Repository: Model<RepositoryDocument> = model<RepositoryDocument>(
  "Repository",
  repositorySchema
);
