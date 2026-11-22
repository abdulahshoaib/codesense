import { model, Schema, type Model } from "mongoose";

import type { McpTokenDocument } from "./mcp-token.types.js";

const mcpTokenSchema = new Schema<McpTokenDocument>(
  {
    userId: {
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
      maxlength: 80
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false
    },
    prefix: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16
    },
    lastUsedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mcpTokenSchema.index({ userId: 1, createdAt: -1 });

export const McpToken: Model<McpTokenDocument> = model<McpTokenDocument>(
  "McpToken",
  mcpTokenSchema
);
