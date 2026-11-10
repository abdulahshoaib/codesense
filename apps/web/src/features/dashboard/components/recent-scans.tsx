import { ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";

import { ScanStatusBadge } from "@/components/feedback/scan-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { ScanWithRepository } from "@/features/scans/hooks/use-scans";
import { formatRelativeTime } from "@/lib/format";

export interface RecentScansProps {
  scans: ScanWithRepository[];
}

export function RecentScans({
  scans
}: RecentScansProps): React.ReactElement {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent scans</CardTitle>
        <Link
          to="/scans"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {scans.length === 0 ? (
          <EmptyState
            icon={ScanSearch}
            title="No scans yet"
            description="Create a scan record to see it here."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {scans.map(({ scan, repository }) => (
              <li
                key={scan.id}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <Link
                    to={`/scans/${scan.id}`}
                    className="truncate text-sm font-medium hover:text-primary hover:underline"
                  >
                    {repository.name}
                  </Link>
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {scan.branch}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <ScanStatusBadge status={scan.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(scan.createdAt)}
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
