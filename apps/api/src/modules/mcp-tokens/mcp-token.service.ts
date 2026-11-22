import crypto from "node:crypto";

import type {
  CreatedMcpTokenDTO,
  CreateMcpTokenInput,
  McpAccessDTO,
  McpTokenDTO
} from "@codesense/shared";
import { buildMcpClientConfigs } from "@codesense/shared";
import { Types } from "mongoose";

import { env } from "../../config/env.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../users/user.model.js";
import { McpToken } from "./mcp-token.model.js";
import {
  toMcpTokenDTO,
  type AuthenticatedMcpToken
} from "./mcp-token.types.js";

const TOKEN_PREFIX = "cs_";
const TOKEN_BYTES = 32;
const DISPLAY_PREFIX_LENGTH = 12;
const MAX_TOKENS_PER_USER = 20;

function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

export function hashMcpToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateMcpToken(): { token: string; prefix: string } {
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(TOKEN_BYTES).toString("base64url")}`;
  return {
    token,
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH)
  };
}

export function getMcpPublicUrl(): string {
  const configured = env.MCP_PUBLIC_URL.trim();

  if (configured.length > 0) {
    return configured.replace(/\/$/, "");
  }

  return `http://localhost:${env.PORT}/mcp`;
}

async function listTokens(userId: string): Promise<McpTokenDTO[]> {
  const tokens = await McpToken.find({ userId: toObjectId(userId) })
    .sort({ createdAt: -1 })
    .exec();

  return tokens.map(toMcpTokenDTO);
}

async function getAccess(userId: string): Promise<McpAccessDTO> {
  const endpoint = getMcpPublicUrl();
  const tokens = await listTokens(userId);

  return {
    endpoint,
    tokens,
    exampleConfigs: buildMcpClientConfigs(endpoint)
  };
}

async function createToken(
  userId: string,
  data: CreateMcpTokenInput
): Promise<CreatedMcpTokenDTO> {
  const existing = await McpToken.countDocuments({
    userId: toObjectId(userId)
  }).exec();

  if (existing >= MAX_TOKENS_PER_USER) {
    throw ApiError.badRequest(
      `A maximum of ${MAX_TOKENS_PER_USER} MCP tokens is allowed`,
      "MCP_TOKEN_LIMIT"
    );
  }

  const { token, prefix } = generateMcpToken();
  const created = await McpToken.create({
    userId: toObjectId(userId),
    name: data.name,
    tokenHash: hashMcpToken(token),
    prefix
  });

  return {
    ...toMcpTokenDTO(created),
    token
  };
}

async function revokeToken(userId: string, tokenId: string): Promise<void> {
  const deleted = await McpToken.findOneAndDelete({
    _id: toObjectId(tokenId),
    userId: toObjectId(userId)
  }).exec();

  if (!deleted) {
    throw ApiError.notFound("MCP token not found", "MCP_TOKEN_NOT_FOUND");
  }
}

async function authenticate(token: string): Promise<AuthenticatedMcpToken | null> {
  if (!token.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  const record = await McpToken.findOne({ tokenHash: hashMcpToken(token) })
    .select("+tokenHash")
    .exec();

  if (!record) {
    return null;
  }

  const user = await User.findById(record.userId).exec();

  if (!user) {
    return null;
  }

  record.lastUsedAt = new Date();
  await record.save();

  return {
    id: record._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    name: record.name
  };
}

export const mcpTokenService = {
  listTokens,
  getAccess,
  createToken,
  revokeToken,
  authenticate
};
