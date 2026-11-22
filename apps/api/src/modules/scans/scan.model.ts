import { model, Schema, type Model } from "mongoose";

import type { ScanDocument } from "./scan.types.js";

const languageSummarySchema = new Schema(
  {
    name: { type: String, required: true },
    files: { type: Number, required: true },
    lines: { type: Number, required: true }
  },
  { _id: false }
);

const dependencySummarySchema = new Schema(
  {
    ecosystem: { type: String, required: true },
    name: { type: String, required: true },
    version: { type: String }
  },
  { _id: false }
);

const scanSummarySchema = new Schema(
  {
    files: { type: Number, required: true },
    linesOfCode: { type: Number, required: true },
    languages: { type: [languageSummarySchema], required: true },
    dependencies: { type: [dependencySummarySchema], required: true }
  },
  { _id: false }
);

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
    committedAt: {
      type: Date
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
    },
    summary: {
      type: scanSummarySchema
    },
    aiSummary: {
      type: String
    },
    llmProvider: {
      type: String,
      trim: true
    },
    llmModel: {
      type: String,
      trim: true
    },
    llmFallbackUsed: {
      type: Boolean
    },
    aiError: {
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
