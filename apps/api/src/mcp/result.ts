import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { ApiError } from "../utils/ApiError.js";
import { MCP_LIMITS } from "./limits.js";

export function jsonToolResult(data: unknown): CallToolResult {
  let text = JSON.stringify(data, null, 2);

  if (text.length > MCP_LIMITS.outputMaxChars) {
    text = `${text.slice(0, MCP_LIMITS.outputMaxChars)}\n…[truncated to ${MCP_LIMITS.outputMaxChars} characters]`;
  }

  return {
    content: [{ type: "text", text }]
  };
}

export function errorToolResult(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true
  };
}

export function toolErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Tool failed";
}

export async function runTool(
  execute: () => Promise<unknown>
): Promise<CallToolResult> {
  try {
    return jsonToolResult(await execute());
  } catch (error) {
    return errorToolResult(toolErrorMessage(error));
  }
}
