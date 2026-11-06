import type { RepositoryDTO, ScanDTO } from "@codesense/shared";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/ui/empty-state";
import { RepositoryStatus } from "@/features/repositories/components/repository-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderGit2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export interface RecentRepositoriesProps {
  repositories: RepositoryDTO[];
  scansByRepository: Map<string, ScanDTO[]>;
}

export function RecentRepositories({
  repositories,
  scansByRepository
}: RecentRepositoriesProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent repositories</CardTitle>
        <Link
          to="/repositories"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {repositories.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="No repositories yet"
            description="Connect a repository to see it here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {repositories.map((repository) => (
              <li
                key={repository.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <Link
                    to={`/repositories/${repository.id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {repository.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">
                      {repository.provider}
                    </Badge>
                    <span className="font-mono">
                      {repository.defaultBranch}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RepositoryStatus
                    scans={scansByRepository.get(repository.id)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(repository.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
