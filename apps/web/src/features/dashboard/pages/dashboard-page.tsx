import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorState } from "@/components/feedback/error-state";
import { TableSkeleton } from "@/components/feedback/table-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickActions } from "@/features/dashboard/components/quick-actions";
import { RecentRepositories } from "@/features/dashboard/components/recent-repositories";
import { RecentScans } from "@/features/dashboard/components/recent-scans";
import {
  SummaryCards,
  type DashboardStats
} from "@/features/dashboard/components/summary-cards";
import { StartScanDialog } from "@/features/scans/components/start-scan-dialog";
import { useAllScans } from "@/features/scans/hooks/use-scans";
import { getErrorMessage } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth.store";

const RECENT_LIMIT = 5;

export function DashboardPage(): React.ReactElement {
  const {
    repositories,
    scansWithRepository,
    scansByRepository,
    isLoading,
    isError,
    error,
    refetch
  } = useAllScans();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isScanOpen, setIsScanOpen] = useState(false);

  const stats = useMemo<DashboardStats>(() => {
    const completed = scansWithRepository.filter(
      (row) => row.scan.status === "completed"
    ).length;
    const pending = scansWithRepository.filter(
      (row) => row.scan.status === "queued" || row.scan.status === "running"
    ).length;

    return {
      repositories: repositories.length,
      scans: scansWithRepository.length,
      completed,
      pending
    };
  }, [repositories, scansWithRepository]);

  const hasRepositories = repositories.length > 0;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Overview"
          description="A summary of your CodeSense workspace."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <TableSkeleton columns={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          title="Overview"
          description="A summary of your CodeSense workspace."
        />
        <ErrorState message={getErrorMessage(error)} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome back${user ? `, ${user.name}` : ""}`}
        description="A summary of your CodeSense workspace."
        actions={
          <Button onClick={() => navigate("/repositories/connect")}>
            <Plus aria-hidden="true" />
            Connect repository
          </Button>
        }
      />

      <SummaryCards stats={stats} />

      {hasRepositories ? (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="flex flex-col gap-5 lg:col-span-2">
            <RecentRepositories
              repositories={repositories.slice(0, RECENT_LIMIT)}
              scansByRepository={scansByRepository}
            />
            <RecentScans
              scans={scansWithRepository.slice(0, RECENT_LIMIT)}
            />
          </div>
          <QuickActions
            onConnect={() => navigate("/repositories/connect")}
            onViewRepositories={() => navigate("/repositories")}
            onStartScan={() => setIsScanOpen(true)}
            canStartScan={hasRepositories}
          />
        </div>
      ) : (
        <EmptyState
          title="Your workspace is empty"
          description="Connect your first repository to start tracking scans and code intelligence."
          action={
            <Button onClick={() => navigate("/repositories/connect")}>
              <Plus aria-hidden="true" />
              Connect repository
            </Button>
          }
        />
      )}

      <StartScanDialog
        open={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        repositories={repositories}
      />
    </div>
  );
}
