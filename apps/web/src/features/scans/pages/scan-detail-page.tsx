import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";
import { ScanStatusBadge } from "@/components/feedback/scan-status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { FullPageSpinner } from "@/components/ui/spinner";
import { useRepository } from "@/features/repositories/hooks/use-repositories";
import { useScan } from "@/features/scans/hooks/use-scans";
import { getErrorMessage } from "@/lib/api-client";
import { formatDateTime, truncateHash } from "@/lib/format";

export function ScanDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const scanQuery = useScan(id);
  const repositoryQuery = useRepository(scanQuery.data?.repositoryId);

  if (scanQuery.isLoading) {
    return <FullPageSpinner label="Loading scan" />;
  }

  if (scanQuery.isError || !scanQuery.data) {
    return (
      <ErrorState
        title="Scan unavailable"
        message={
          scanQuery.error
            ? getErrorMessage(scanQuery.error)
            : "This scan could not be found."
        }
        onRetry={() => void scanQuery.refetch()}
      />
    );
  }

  const scan = scanQuery.data;
  const repositoryName = repositoryQuery.data?.name;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Scan ${scan.id.slice(-8)}`}
        badge={<ScanStatusBadge status={scan.status} />}
        description="Scan record details. Execution and analysis results are not available yet."
        actions={
          <Button variant="outline" onClick={() => navigate("/scans")}>
            <ArrowLeft aria-hidden="true" />
            Back to scans
          </Button>
        }
      />

      <Alert variant="info" title="Scan execution not implemented">
        The backend stores the scan record and its status only. No progress,
        findings, or analysis output can be displayed.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Scan information</CardTitle>
          <CardDescription>Recorded scan metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </dt>
              <dd>
                <ScanStatusBadge status={scan.status} />
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Repository
              </dt>
              <dd className="text-sm">
                {repositoryName ? (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() =>
                      navigate(`/repositories/${scan.repositoryId}`)
                    }
                  >
                    {repositoryName}
                  </button>
                ) : (
                  scan.repositoryId
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Branch
              </dt>
              <dd className="font-mono text-xs">{scan.branch}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Commit hash
              </dt>
              <dd className="font-mono text-xs">
                {truncateHash(scan.commitHash, 12)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Created
              </dt>
              <dd className="text-sm">{formatDateTime(scan.createdAt)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Started
              </dt>
              <dd className="text-sm">{formatDateTime(scan.startedAt)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Completed
              </dt>
              <dd className="text-sm">{formatDateTime(scan.completedAt)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Scan ID
              </dt>
              <dd className="font-mono text-xs">{scan.id}</dd>
            </div>
          </dl>

          {scan.error ? (
            <Alert variant="destructive" title="Error details" className="mt-3">
              {scan.error}
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
