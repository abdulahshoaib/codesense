export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const
  },
  repositories: {
    all: () => ["repositories"] as const,
    list: () => ["repositories", "list"] as const,
    detail: (id: string) => ["repositories", "detail", id] as const
  },
  scans: {
    forRepository: (repositoryId: string) =>
      ["scans", "repository", repositoryId] as const,
    detail: (id: string) => ["scans", "detail", id] as const,
    aggregate: () => ["scans", "aggregate"] as const
  }
};
