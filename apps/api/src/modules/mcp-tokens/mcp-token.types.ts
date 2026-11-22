import type { McpTokenDTO } from "@codesense/shared";
import type { Types } from "mongoose";

export interface McpTokenDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  tokenHash: string;
  prefix: string;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedMcpToken {
  id: string;
  userId: string;
  email: string;
  name: string;
}

export function toMcpTokenDTO(token: McpTokenDocument): McpTokenDTO {
  return {
    id: token._id.toString(),
    name: token.name,
    prefix: token.prefix,
    lastUsedAt: token.lastUsedAt ? token.lastUsedAt.toISOString() : null,
    createdAt: token.createdAt.toISOString()
  };
}
