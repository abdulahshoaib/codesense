import type {
  CommitHistoryDTO,
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
  useRepositoryCommits,
  useRepositoryInsight
} from "@/features/repositories/hooks/use-repositories";
import { getErrorMessage } from "@/lib/api-client";
import { formatDate, truncateHash } from "@/lib/format";

interface RepositoryInsightPanelProps {
  repositoryId: string;
}

export type RepositoryActivitySection = "issues" | "pulls" | "history";

const HEADING =
  /^(?:#{1,3}\s*)?(?:current implementation|future|suggestions)\b[:\s-]*/i;

export function splitProjectContext(context: string): {
  current: string;
  future: string | null;
} {
  const lines = context.trim().split("\n");
  const futureIndex = lines.findIndex((line) =>
    /^(?:#{1,3}\s*)?(?:future|suggestions)\b/i.test(line.trim())
  );

  if (futureIndex === -1) {
    return {
      current: lines.join("\n").replace(HEADING, "").trim(),
      future: null
    };
  }

  return {
    current: lines.slice(0, futureIndex).join("\n").replace(HEADING, "").trim(),
    future:
      lines.slice(futureIndex).join("\n").replace(HEADING, "").trim() || null
  };
}

const DESCRIPTION_LIMIT = 180;

function briefDescription(item: {
  aiSummary?: string;
  body: string | null;
}): string | null {
  const summary = item.aiSummary?.trim();
  if (summary) {
    return summary;
  }

  const line = item.body
    ?.split("\n")
    .map((part) => part.trim())
    .find((part) => part.length > 0);

  if (!line) {
    return null;
  }

  return line.length > DESCRIPTION_LIMIT
    ? `${line.slice(0, DESCRIPTION_LIMIT - 1)}…`
    : line;
}

function prStateVariant(
  state: RepositoryPullRequestDTO["state"]
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
      className="text-sm font-medium text-primary hover:underline"
    >
      {children}
    </a>
  );
}

function IssueList({
  issues
}: {
  issues: RepositoryIssueDTO[];
}): React.ReactElement {
  if (issues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No open issues.</p>
    );
  }

  return (
    <ul className="flex max-h-80 flex-col divide-y divide-border overflow-auto">
      {issues.map((issue) => {
        const description = briefDescription(issue);

        return (
          <li key={issue.number} className="flex flex-col gap-1 py-2.5">
            <InsightLink href={issue.url}>
              #{issue.number} {issue.title}
            </InsightLink>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function PullRequestList({
  pullRequests
}: {
  pullRequests: RepositoryPullRequestDTO[];
}): React.ReactElement {
  if (pullRequests.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pull requests.</p>
    );
  }

  return (
    <ul className="flex max-h-80 flex-col divide-y divide-border overflow-auto">
      {pullRequests.map((pullRequest) => {
        const description = briefDescription(pullRequest);

        return (
          <li key={pullRequest.number} className="flex flex-col gap-1 py-2.5">
            <div className="flex items-center gap-2">
              <InsightLink href={pullRequest.url}>
                #{pullRequest.number} {pullRequest.title}
              </InsightLink>
              <Badge
                variant={prStateVariant(pullRequest.state)}
                className="capitalize"
              >
                {pullRequest.state}
              </Badge>
            </div>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

const GRAPH_ROW = 44;
const GRAPH_LANE = 16;
const GRAPH_COLORS = [
  "var(--primary)",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#c084fc",
  "#fb7185"
];

export interface CommitGraphRow {
  commit: CommitHistoryDTO;
  lane: number;
  parents: string[];
}

export function layoutCommitGraph(commits: CommitHistoryDTO[]): CommitGraphRow[] {
  const linked = commits.some((commit) => (commit.parents ?? []).length > 0);
  const columns: Array<string | null> = [];
  const rows: CommitGraphRow[] = [];

  commits.forEach((commit, index) => {
    const next = commits[index + 1];
    const stored = commit.parents ?? [];
    const parents =
      stored.length > 0 ? stored : !linked && next ? [next.sha] : stored;
    let lane = columns.indexOf(commit.sha);

    if (lane === -1) {
      lane = columns.indexOf(null);
      if (lane === -1) {
        columns.push(null);
        lane = columns.length - 1;
      }
    }

    for (let column = 0; column < columns.length; column += 1) {
      if (columns[column] === commit.sha) {
        columns[column] = null;
      }
    }

    const [first, ...rest] = parents;

    if (first && !columns.includes(first)) {
      columns[lane] = first;
    }

    for (const parent of rest) {
      if (columns.includes(parent)) {
        continue;
      }

      const free = columns.indexOf(null);
      if (free === -1) {
        columns.push(parent);
      } else {
        columns[free] = parent;
      }
    }

    rows.push({ commit, lane, parents });
  });

  return rows;
}

function HistoryTimeline({
  commits
}: {
  commits: CommitHistoryDTO[];
}): React.ReactElement {
  if (commits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No commits loaded yet.</p>
    );
  }

  const rows = layoutCommitGraph(commits);
  const laneCount = rows.reduce((count, row) => Math.max(count, row.lane + 1), 1);
  const width = laneCount * GRAPH_LANE;
  const height = rows.length * GRAPH_ROW;
  const indexBySha = new Map(rows.map((row, index) => [row.commit.sha, index]));
  const edges = rows.flatMap((row, index) =>
    row.parents.flatMap((parent) => {
      const parentIndex = indexBySha.get(parent);

      if (parentIndex === undefined) {
        return [];
      }

      const x1 = row.lane * GRAPH_LANE + GRAPH_LANE / 2;
      const y1 = index * GRAPH_ROW + GRAPH_ROW / 2;
      const x2 = rows[parentIndex].lane * GRAPH_LANE + GRAPH_LANE / 2;
      const y2 = parentIndex * GRAPH_ROW + GRAPH_ROW / 2;
      const path =
        x1 === x2
          ? `M ${x1} ${y1} L ${x2} ${y2}`
          : `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`;

      return [
        {
          key: `${row.commit.sha}-${parent}`,
          path,
          color: GRAPH_COLORS[row.lane % GRAPH_COLORS.length]
        }
      ];
    })
  );

  return (
    <div className="flex max-h-96 gap-3 overflow-auto">
      <svg
        width={width}
        height={height}
        className="shrink-0"
        aria-hidden="true"
      >
        {edges.map((edge) => (
          <path
            key={edge.key}
            d={edge.path}
            stroke={edge.color}
            strokeWidth="1.5"
            fill="none"
          />
        ))}
        {rows.map((row, index) => (
          <circle
            key={row.commit.sha}
            cx={row.lane * GRAPH_LANE + GRAPH_LANE / 2}
            cy={index * GRAPH_ROW + GRAPH_ROW / 2}
            r="3.5"
            fill={GRAPH_COLORS[row.lane % GRAPH_COLORS.length]}
          />
        ))}
      </svg>
      <ol className="min-w-0 flex-1">
        {rows.map((row) => {
          const message = row.commit.message.split("\n")[0] ?? row.commit.message;

          return (
            <li
              key={row.commit.sha}
              className="flex flex-col justify-center"
              style={{ height: GRAPH_ROW }}
            >
              <InsightLink href={row.commit.url}>{message}</InsightLink>
              <p className="truncate text-xs text-muted-foreground">
                {row.commit.author ?? "Unknown"} · {truncateHash(row.commit.sha)} ·{" "}
                {formatDate(row.commit.committedAt)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ContextCopy({ text }: { text: string }): React.ReactElement {
  return (
    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{text}</p>
  );
}

function ProjectContextBody({
  context
}: {
  context: string;
}): React.ReactElement {
  if (!context.trim()) {
    return (
      <ContextCopy text="Run a scan to describe what this repository implements and what to build next." />
    );
  }

  const { current, future } = splitProjectContext(context);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Current implementation
        </h3>
        <ContextCopy
          text={current || "The latest scan did not describe the current code."}
        />
      </section>
      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Future
        </h3>
        <ContextCopy
          text={
            future ||
            "Suggestions appear after the next scan that reads the source."
          }
        />
      </section>
    </div>
  );
}

export function RepositoryInsightPanel({
  repositoryId
}: RepositoryInsightPanelProps): React.ReactElement {
  const insightQuery = useRepositoryInsight(repositoryId);
  const insight = insightQuery.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project context</CardTitle>
        <CardDescription>
          What the repository implements today, and what to build next.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
          <ProjectContextBody context={insight.context} />
        )}
      </CardContent>
    </Card>
  );
}

export function RepositoryActivity({
  repositoryId,
  section
}: {
  repositoryId: string;
  section: RepositoryActivitySection;
}): React.ReactElement {
  const insightQuery = useRepositoryInsight(repositoryId);
  const commitsQuery = useRepositoryCommits(
    section === "history" ? repositoryId : undefined
  );
  const refreshInsight = useRefreshRepositoryInsight();
  const insight = insightQuery.data;
  const openIssues =
    insight?.issues.filter((issue) => issue.state === "open") ?? [];
  const title =
    section === "issues"
      ? "Issues"
      : section === "pulls"
        ? "Pull requests"
        : "History";
  const description =
    section === "issues"
      ? "Open issues and a short description of each."
      : section === "pulls"
        ? "Pull requests and what each one changes."
        : "Commit graph for the default branch.";

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (section === "history") {
              void commitsQuery.refetch();
              return;
            }

            refreshInsight.mutate(repositoryId);
          }}
          isLoading={
            section === "history"
              ? commitsQuery.isFetching
              : refreshInsight.isPending
          }
        >
          <RefreshCw aria-hidden="true" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {section !== "history" && refreshInsight.isError ? (
          <Alert variant="destructive" title="Refresh failed">
            {getErrorMessage(refreshInsight.error)}
          </Alert>
        ) : null}
        {section === "history" ? (
          commitsQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : commitsQuery.isError ? (
            <ErrorState
              message={getErrorMessage(commitsQuery.error)}
              onRetry={() => void commitsQuery.refetch()}
            />
          ) : (
            <HistoryTimeline commits={commitsQuery.data ?? []} />
          )
        ) : insightQuery.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : insightQuery.isError || !insight ? (
          <ErrorState
            message={
              insightQuery.error
                ? getErrorMessage(insightQuery.error)
                : "GitHub activity could not be loaded."
            }
            onRetry={() => void insightQuery.refetch()}
          />
        ) : section === "issues" ? (
          <IssueList issues={openIssues} />
        ) : (
          <PullRequestList pullRequests={insight.pullRequests} />
        )}
      </CardContent>
    </Card>
  );
}
