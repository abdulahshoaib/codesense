import type {
  CreatedMcpTokenDTO,
  CreateMcpTokenInput,
  McpAccessDTO
} from "@codesense/shared";

import { apiClient } from "@/lib/api-client";

export const mcpService = {
  getAccess(): Promise<McpAccessDTO> {
    return apiClient.get<McpAccessDTO>("/users/me/mcp");
  },

  createToken(input: CreateMcpTokenInput): Promise<CreatedMcpTokenDTO> {
    return apiClient.post<CreatedMcpTokenDTO>("/users/me/mcp/tokens", input);
  },

  revokeToken(id: string): Promise<null> {
    return apiClient.delete<null>(`/users/me/mcp/tokens/${id}`);
  }
};
