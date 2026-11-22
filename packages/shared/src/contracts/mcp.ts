export interface McpTokenDTO {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreatedMcpTokenDTO extends McpTokenDTO {
  token: string;
}

export interface McpHttpClientConfig {
  url: string;
  headers: {
    Authorization: string;
  };
}

export interface McpStdioClientConfig {
  command: string;
  args: string[];
  env: {
    CODESENSE_MCP_TOKEN: string;
  };
}

export interface McpClientConfigs {
  cursor: {
    mcpServers: {
      codesense: McpHttpClientConfig;
    };
  };
  claudeDesktop: {
    mcpServers: {
      codesense: McpHttpClientConfig | McpStdioClientConfig;
    };
  };
  vscode: {
    servers: {
      codesense: McpHttpClientConfig & { type: "http" };
    };
  };
}

export interface McpAccessDTO {
  endpoint: string;
  tokens: McpTokenDTO[];
  exampleConfigs: McpClientConfigs;
}

export function buildMcpClientConfigs(
  endpoint: string,
  token = "<token>"
): McpClientConfigs {
  const httpConfig: McpHttpClientConfig = {
    url: endpoint,
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  return {
    cursor: {
      mcpServers: {
        codesense: httpConfig
      }
    },
    claudeDesktop: {
      mcpServers: {
        codesense: httpConfig
      }
    },
    vscode: {
      servers: {
        codesense: {
          type: "http",
          ...httpConfig
        }
      }
    }
  };
}

export function buildMcpStdioConfig(token = "<token>"): McpStdioClientConfig {
  return {
    command: "pnpm",
    args: ["--filter", "@codesense/api", "mcp:stdio"],
    env: {
      CODESENSE_MCP_TOKEN: token
    }
  };
}
