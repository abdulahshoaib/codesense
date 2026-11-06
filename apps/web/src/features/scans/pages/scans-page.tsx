import { Play, ScanSearch } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScanTable } from "@/features/scans/components/scan-table";
import { StartScanDialog } from "@/features/scans/components/start-scan-dialog";
import { useAllScans } from "@/features/scans/hooks/use-scans";
import { getErrorMessage } from "@/lib/api-client";

export function ScansPage(): React.ReactElement {
  const { repositories, scansWithRepository, isLoading, isError, error, refetch } =
    useAllScans();
  const [isScanOpen, setIsScanOpen] = useState(false);
  const navigate = useNavigate();

  const repositoryNames = new Map(
    repositories.map((repository) => [repository.id, repository.name])
  );

  const canStartScan = repositories.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scans"
        description="Scan records across all connected repositories."
        actions={
          <Button
            onClick={() => setIsScanOpen(true)}
            disabled={!canStartScan}
          >
            <Play aria-hidden="true" />
            Start scan
          </Button>
        }
      />

      <Alert variant="info" title="Scan execution not implemented">
        CodeSense stores scan records only. Scan progress, analysis results, and
        background execution are part of a later development phase.
      </Alert>

      <Card>
        <CardContent className="pt-5">
          {isLoading ? (
            <TableSkeleton columns={6} />
          ) : isError ? (
            <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
          ) : !canStartScan ? (
            <EmptyState
              icon={ScanSearch}
              title="No repositories connected"
              description="Connect a repository before creating scan records."
              action={
                <Button onClick={() => navigate("/repositories/connect")}>
                  Connect repository
                </Button>
              }
            />
          ) : scansWithRepository.length === 0 ? (
            <EmptyState
              icon={ScanSearch}
              title="No scans yet"
              description="Create a scan record to start tracking analysis for a repository."
              action={
                <Button onClick={() => setIsScanOpen(true)}>
                  <Play aria-hidden="true" />
                  Start scan
                </Button>
              }
            />
          ) : (
            <ScanTable
              scans={scansWithRepository.map((row) => row.scan)}
              showRepository
              getRepositoryName={(repositoryId) =>
                repositoryNames.get(repositoryId)
              }
            />
          )}
        </CardContent>
      </Card>

      <StartScanDialog
        open={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        repositories={repositories}
      />
    </div>
  );
}
