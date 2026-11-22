export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const
  },
  github: {
    repositories: () => ["github", "repositories"] as const
  },
  llm: {
    models: () => ["llm", "models"] as const
  },
  mcp: {
    access: () => ["mcp", "access"] as const
  },
  repositories: {
    all: () => ["repositories"] as const,
    list: () => ["repositories", "list"] as const,
    detail: (id: string) => ["repositories", "detail", id] as const,
    branches: (id: string) => ["repositories", "branches", id] as const,
    insight: (id: string) => ["repositories", "insight", id] as const,
    commits: (id: string) => ["repositories", "commits", id] as const
  },
  scans: {
    forRepository: (repositoryId: string) =>
      ["scans", "repository", repositoryId] as const,
    detail: (id: string) => ["scans", "detail", id] as const,
    aggregate: () => ["scans", "aggregate"] as const
  }
};
