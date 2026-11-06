import { model, Schema, type Model } from "mongoose";

import type { ScanDocument } from "./scan.types.js";

const scanSchema = new Schema<ScanDocument>(
  {
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    branch: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    commitHash: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed"],
      required: true,
      default: "queued"
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    error: {
      type: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

scanSchema.index({ repositoryId: 1, createdAt: -1 });
scanSchema.index({ ownerId: 1, status: 1 });

export const Scan: Model<ScanDocument> = model<ScanDocument>("Scan", scanSchema);
