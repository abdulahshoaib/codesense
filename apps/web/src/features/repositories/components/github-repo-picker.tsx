import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGithubRepositories } from "@/features/repositories/hooks/use-github-repositories";
import {
  useCreateRepository,
  useRepositories
} from "@/features/repositories/hooks/use-repositories";
import { getErrorMessage } from "@/lib/api-client";

const DEFAULT_VISIBLE_COUNT = 6;

export function GithubRepoPicker(): React.ReactElement {
  const githubRepos = useGithubRepositories();
  const repositories = useRepositories();
  const createRepository = useCreateRepository();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const connectedUrls = useMemo(
    () => new Set((repositories.data ?? []).map((repo) => repo.url)),
    [repositories.data]
  );

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    const repos = githubRepos.data ?? [];

    if (!q) {
      return repos.slice(0, DEFAULT_VISIBLE_COUNT);
    }

    return repos.filter(
      (repo) =>
        repo.name.toLowerCase().includes(q) ||
        repo.fullName.toLowerCase().includes(q)
    );
  }, [githubRepos.data, query]);

  if (githubRepos.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (githubRepos.isError) {
    return (
      <Alert variant="destructive" title="Failed to load GitHub repositories">
        {getErrorMessage(githubRepos.error)}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {createRepository.isError ? (
        <Alert variant="destructive" title="Unable to connect repository">
          {getErrorMessage(createRepository.error)}
        </Alert>
      ) : null}

      <Input
        type="search"
        placeholder="Search repositories..."
        aria-label="Search GitHub repositories"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {filteredRepos.length === 0 ? (
        <EmptyState
          title={
            query.trim().length > 0
              ? "No matching repositories"
              : "No repositories found"
          }
          description={
            query.trim().length > 0
              ? "No GitHub repositories match your search."
              : "Your GitHub account has no repositories to import."
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {filteredRepos.map((repo) => {
            const connected = connectedUrls.has(repo.url);
            const isConnecting =
              createRepository.isPending &&
              createRepository.variables?.url === repo.url;

            return (
              <li
                key={repo.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {repo.name}
                    </span>
                    <Badge variant={repo.private ? "secondary" : "outline"}>
                      {repo.private ? "Private" : "Public"}
                    </Badge>
                  </div>
                  <span className="truncate text-xs text-muted-foreground">
                    {repo.fullName}
                  </span>
                </div>

                {connected ? (
                  <Badge variant="success">Connected</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    isLoading={isConnecting}
                    disabled={createRepository.isPending}
                    onClick={() =>
                      createRepository.mutate(
                        {
                          name: repo.name,
                          url: repo.url,
                          provider: "github",
                          defaultBranch: repo.defaultBranch || "main",
                          description: repo.description ?? undefined,
                          githubFullName: repo.fullName
                        },
                        { onSuccess: () => navigate("/scans") }
                      )
                    }
                  >
                    Connect
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
