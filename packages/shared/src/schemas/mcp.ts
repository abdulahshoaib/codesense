import { z } from "zod";

import { objectIdSchema } from "./common.js";

export const MCP_TOKEN_NAME_MAX = 80;

export const createMcpTokenSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(MCP_TOKEN_NAME_MAX, `Name must be at most ${MCP_TOKEN_NAME_MAX} characters`)
});

export const mcpTokenIdParamSchema = z.object({
  id: objectIdSchema
});

export type CreateMcpTokenInput = z.infer<typeof createMcpTokenSchema>;
