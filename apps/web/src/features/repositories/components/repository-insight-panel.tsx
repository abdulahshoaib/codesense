import type {
  CommitHistoryDTO,
  ProjectContextDTO,
  RepositoryIssueDTO,
  RepositoryPullRequestDTO
} from "@codesense/shared";
import { RefreshCw } from "lucide-react";

import { ErrorState } from "@/components/feedback/error-state";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useRefreshRepositoryInsight,
  useRepositoryInsight
} from "@/features/repositories/hooks/use-repositories";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, truncateHash } from "@/lib/format";

interface RepositoryInsightPanelProps {
  repositoryId: string;
  provider: "github" | "local";
}

function stateVariant(
  state: string
): "success" | "secondary" | "outline" {
  if (state === "open" || state === "merged") {
    return "success";
  }

  if (state === "closed") {
    return "secondary";
  }

  return "outline";
}

function InsightLink({
  href,
  children
}: {
  href: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="truncate text-sm font-medium text-primary hover:underline"
    >
      {children}
    </a>
  );
}

function IssueRow({
  item
}: {
  item: RepositoryIssueDTO | RepositoryPullRequestDTO;
}): React.ReactElement {
  return (
    <li className="flex flex-col gap-1 py-2.5">
      <div className="flex items-center gap-2">
        <InsightLink href={item.url}>
          #{item.number} {item.title}
        </InsightLink>
        <Badge variant={stateVariant(item.state)} className="capitalize">
          {item.state}
        </Badge>
      </div>
      {item.aiSummary ? (
        <p className="text-sm text-muted-foreground">{item.aiSummary}</p>
      ) : null}
    </li>
  );
}

function CommitRow({ item }: { item: CommitHistoryDTO }): React.ReactElement {
  const message = item.message.split("\n")[0] ?? item.message;

  return (
    <li className="flex items-baseline justify-between gap-3 py-2.5">
      <InsightLink href={item.url}>{message}</InsightLink>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {truncateHash(item.sha)} · {formatDate(item.committedAt)}
      </span>
    </li>
  );
}

function InsightList<T>({
  title,
  items,
  renderItem
}: {
  title: string;
  items: T[];
  renderItem: (item: T) => React.ReactElement;
}): React.ReactElement | null {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="max-h-80 divide-y divide-border overflow-auto">
        {items.map(renderItem)}
      </ul>
    </div>
  );
}

function hasGithubActivity(insight: ProjectContextDTO): boolean {
  return (
    insight.issues.length > 0 ||
    insight.pullRequests.length > 0 ||
    insight.commits.length > 0
  );
}

export function RepositoryInsightPanel({
  repositoryId,
  provider
}: RepositoryInsightPanelProps): React.ReactElement {
  const insightQuery = useRepositoryInsight(repositoryId);
  const refreshInsight = useRefreshRepositoryInsight();
  const insight = insightQuery.data;
  const isGithub = provider === "github";

  const handleRefresh = (): void => {
    refreshInsight.mutate(repositoryId);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <CardTitle>Project context</CardTitle>
          <CardDescription>
            Architecture notes from the latest scan
            {isGithub ? ", plus recent GitHub activity" : ""}.
          </CardDescription>
        </div>
        {isGithub ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            isLoading={refreshInsight.isPending}
          >
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {insightQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : insightQuery.isError || !insight ? (
          <ErrorState
            message={
              insightQuery.error
                ? getErrorMessage(insightQuery.error)
                : "Project context could not be loaded."
            }
            onRetry={() => void insightQuery.refetch()}
          />
        ) : (
          <>
            {refreshInsight.isError ? (
              <Alert variant="destructive" title="Refresh failed">
                {getErrorMessage(refreshInsight.error)}
              </Alert>
            ) : null}
            {insight.context ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {insight.context}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Run a scan to generate an architecture overview for this
                repository.
              </p>
            )}
            {isGithub && hasGithubActivity(insight) ? (
              <>
                <InsightList
                  title="Issues"
                  items={insight.issues}
                  renderItem={(issue) => (
                    <IssueRow key={issue.number} item={issue} />
                  )}
                />
                <InsightList
                  title="Pull requests"
                  items={insight.pullRequests}
                  renderItem={(pullRequest) => (
                    <IssueRow key={pullRequest.number} item={pullRequest} />
                  )}
                />
                <InsightList
                  title="Commits"
                  items={insight.commits}
                  renderItem={(commit) => (
                    <CommitRow key={commit.sha} item={commit} />
                  )}
                />
              </>
            ) : null}
            {isGithub && !hasGithubActivity(insight) ? (
              <p className="text-sm text-muted-foreground">
                Refresh to load recent issues, pull requests, and commits.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
