import { model, Schema, type Model } from "mongoose";

import type { ProjectContextDocument } from "./repository-insight.types.js";

const issueSchema = new Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    state: { type: String, enum: ["open", "closed"], required: true },
    url: { type: String, required: true },
    author: { type: String, default: null },
    createdAt: { type: String, required: true },
    aiSummary: { type: String }
  },
  { _id: false }
);

const pullRequestSchema = new Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: null },
    state: {
      type: String,
      enum: ["open", "closed", "merged"],
      required: true
    },
    url: { type: String, required: true },
    author: { type: String, default: null },
    createdAt: { type: String, required: true },
    aiSummary: { type: String }
  },
  { _id: false }
);

const commitSchema = new Schema(
  {
    sha: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, default: null },
    committedAt: { type: String, required: true },
    url: { type: String, required: true },
    parents: { type: [String], default: [] }
  },
  { _id: false }
);

const projectContextSchema = new Schema<ProjectContextDocument>(
  {
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      unique: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    // Empty is valid until a scan writes a summary. required rejects "".
    context: { type: String, default: "" },
    lastCommitHash: { type: String },
    issues: { type: [issueSchema], default: [] },
    pullRequests: { type: [pullRequestSchema], default: [] },
    commits: { type: [commitSchema], default: [] }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const ProjectContext: Model<ProjectContextDocument> =
  model<ProjectContextDocument>("ProjectContext", projectContextSchema);
