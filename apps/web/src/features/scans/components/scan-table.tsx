import type { ScanDTO } from "@codesense/shared";
import { Link } from "react-router-dom";

import { ScanStatusBadge } from "@/components/feedback/scan-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { formatDateTime, truncateHash } from "@/lib/format";

export interface ScanTableProps {
  scans: ScanDTO[];
  showRepository?: boolean;
  getRepositoryName?: (repositoryId: string) => string | undefined;
}

export function ScanTable({
  scans,
  showRepository = false,
  getRepositoryName
}: ScanTableProps): React.ReactElement {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Scan</TableHead>
          {showRepository ? <TableHead>Repository</TableHead> : null}
          <TableHead>Branch</TableHead>
          <TableHead>Commit</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scans.map((scan) => (
          <TableRow key={scan.id}>
            <TableCell>
              <Link
                to={`/scans/${scan.id}`}
                className="font-mono text-xs text-primary hover:underline"
              >
                {scan.id.slice(-8)}
              </Link>
            </TableCell>
            {showRepository ? (
              <TableCell className="text-sm">
                {getRepositoryName?.(scan.repositoryId) ?? "—"}
              </TableCell>
            ) : null}
            <TableCell className="font-mono text-xs">{scan.branch}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {truncateHash(scan.commitHash)}
            </TableCell>
            <TableCell>
              <ScanStatusBadge status={scan.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {formatDateTime(scan.createdAt)}
            </TableCell>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {scan.completedAt ? formatDateTime(scan.completedAt) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
